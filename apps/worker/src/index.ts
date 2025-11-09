import { envPromise } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import { initOpenTelemetry } from '@zouari-app/tracing';

import type { Worker } from 'bullmq';
import { Queue } from 'bullmq';

import { getRedisConnection } from './connection.js';
import { createCleanupWorker } from './jobs/cleanup.job.js';
import { createEmailWorker } from './jobs/email.job.js';

async function main() {
  let emailWorker: Worker | undefined;
  let cleanupWorker: Worker | undefined;
  let cleanupQueue: Queue | undefined;

  try {
    // Await the pre-initialized envPromise at the *very* start.
    const env = await envPromise;
    logger.info({ env: env.NODE_ENV }, 'Environment loaded.');

    // Initialize tracing
    if (env.OTEL_ENABLED) {
      process.env.OTEL_SERVICE_NAME = env.OTEL_SERVICE_NAME || 'worker';
      process.env.OTEL_COLLECTOR_URL = env.OTEL_EXPORTER_OTLP_ENDPOINT;
      // Add other OTEL env vars here if needed

      initOpenTelemetry(env.OTEL_SERVICE_NAME || 'worker');
      logger.info('OpenTelemetry initialized.');
    }

    logger.info('Starting BullMQ worker...');

    // Await the async connection *once*
    const connection = await getRedisConnection();
    logger.info('BullMQ connection promise resolved.');

    // Await the async worker creation
    emailWorker = await createEmailWorker();
    cleanupWorker = await createCleanupWorker();

    // Create the queue for scheduling, using the awaited connection
    cleanupQueue = new Queue('cleanup', { connection });

    // Schedule recurring cleanup job (idempotent)
    await cleanupQueue.add(
      'expired-sessions',
      { type: 'expired-sessions' },
      {
        repeat: {
          pattern: '0 * * * *', // Every hour
        },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    logger.info('Worker service started successfully.');
    logger.info('Recurring cleanup job for "expired-sessions" scheduled.');

    // Graceful shutdown handler
    const signals = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        // Close all workers and queues
        await emailWorker?.close();
        await cleanupWorker?.close();
        await cleanupQueue?.close();
        logger.info('All workers and queues closed.');
        process.exit(0);
      });
    }
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start worker service');
    process.exit(1);
  }
}

main();
