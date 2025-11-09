import { redisPromise } from '@zouari-app/cache';
import { logger } from '@zouari-app/logger';
import type { ConnectionOptions } from 'bullmq';

/**
 * Singleton promise for the BullMQ connection options.
 * This re-uses the singleton ioredis client from `@zouari-app/cache`
 * for maximum performance and resource efficiency.
 */
let connectionPromise: Promise<ConnectionOptions> | null = null;

export function getRedisConnection(): Promise<ConnectionOptions> {
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const log = logger.child({ module: 'bullmq-connection' });
    try {
      // Await the singleton client from the cache package
      const client = await redisPromise;
      log.info('Successfully re-using singleton Redis client for BullMQ.');

      // Return the client instance directly to BullMQ.
      return {
        connection: client,

        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
    } catch (error) {
      log.fatal({ err: error }, 'Failed to get Redis client for BullMQ');
      // If we can't connect to Redis, the worker is dead. Exit.
      process.exit(1);
    }
  })();

  return connectionPromise;
}
