import { getEnvSync } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import { getRedisConnection } from '../connection.js';

// Create a reusable transporter singleton
let mailTransporter: Transporter | null = null;

function getMailTransporter() {
  if (mailTransporter) {
    return mailTransporter;
  }

  const env = getEnvSync();
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    logger.warn('Missing SMTP credentials. Email worker will log to console.');
    return null;
  }

  mailTransporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  logger.info('Nodemailer transporter created.');
  return mailTransporter;
}
// ---------------------------------

/**
 * Define the expected data for an email job.
 */
interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email job processor.
 * Handles sending emails via SMTP.
 */
async function processEmailJob(job: Job<EmailJobData>) {
  const { to, subject, html, text } = job.data;
  const log = logger.child({ module: 'email-processor', jobId: job.id, to });

  log.info(`Processing email job for: ${to}`);

  try {
    const env = getEnvSync();
    const transporter = getMailTransporter();

    // Fallback to console logging if SMTP is not configured
    if (!transporter) {
      log.warn(
        { subject, html: `${html.substring(0, 50)}...` },
        'No SMTP transporter. Logging email to console:'
      );
      return { success: true, to, message: 'Logged to console' };
    }

    const info = await transporter.sendMail({
      from: env.EMAIL_FROM, // From address from env
      to,
      subject,
      html,
      text,
    });

    log.info(`Email sent successfully: ${info.messageId}`);
    return { success: true, to, messageId: info.messageId };
  } catch (error) {
    log.error({ err: error }, 'Failed to send email');
    // Re-throw the error so BullMQ marks the job as failed
    throw error;
  }
}

/**
 * Create and initialize the email worker.
 * This is now an async function.
 */
export async function createEmailWorker() {
  const log = logger.child({ module: 'email-worker' });

  // Await the asynchronous connection promise
  const connection = await getRedisConnection();

  const env = getEnvSync();

  const worker = new Worker('email', processEmailJob, {
    connection,
    concurrency: env.WORKER_CONCURRENCY, // Use env var for concurrency
    limiter: {
      max: 10, // Max 10 emails
      duration: 1000, // per second
    },
  });

  // Define the specific shape of the return value
  type EmailJobResult = {
    messageId?: string;
    message?: string;
  };

  worker.on('completed', (_job: Job, result: EmailJobResult) => {
    log.info(`Email job completed: ${result.messageId || result.message}`);
  });

  worker.on('failed', (job, error) => {
    log.error({ err: error, jobId: job?.id }, 'Email job failed');
  });

  log.info('Email worker started.');
  return worker;
}
