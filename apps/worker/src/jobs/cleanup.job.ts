import { authSessions, dbPromise } from '@zouari-app/db';
import { logger } from '@zouari-app/logger';
import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { lt } from 'drizzle-orm';
import { getRedisConnection } from '../connection.js';

interface CleanupJobData {
  type: 'expired-sessions' | 'old-logs';
}

/**
 * Cleanup job processor
 * Handles periodic cleanup tasks
 */
async function processCleanupJob(job: Job<CleanupJobData>) {
  const { type } = job.data;
  const log = logger.child({ module: 'cleanup-processor', jobId: job.id, type });
  log.info('Processing cleanup job');

  try {
    const db = await dbPromise;

    switch (type) {
      case 'expired-sessions': {
        // Delete expired sessions
        const result = await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
        log.info({ count: result.count }, 'Expired sessions cleaned up');
        break;
      }
      case 'old-logs': {
        // Cleanup old logs (implement based on your logging strategy)
        log.info('Old logs cleanup (not implemented)');
        break;
      }
      default:
        log.warn({ type }, 'Unknown cleanup type');
    }
    return { success: true, type };
  } catch (error) {
    // This catch block already correctly logs the full error object
    log.error({ err: error, jobId: job.id, type }, 'Cleanup job failed');
    throw error;
  }
}

/**
 * Create cleanup worker
 */
export async function createCleanupWorker() {
  const log = logger.child({ module: 'cleanup-worker' });

  const connection = await getRedisConnection();

  const worker = new Worker('cleanup', processCleanupJob, {
    connection,
    concurrency: 1, // This is a good, intentional choice for a cleanup job
  });

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Cleanup job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({ err: error, jobId: job?.id }, 'Cleanup job failed');
  });

  log.info('Cleanup worker started.');
  return worker;
}
