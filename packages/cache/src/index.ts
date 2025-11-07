import { getEnv } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import { Redis } from 'ioredis';

/**
 * Type export for the Redis client.
 */
export type { Redis };

const log = logger.child({ module: 'redis-client' });

/**
 * Singleton pattern for the Redis client.
 * We use 'globalThis' to ensure the promise is truly a singleton
 * across Hot Module Replacement (HMR) reloads in development.
 */
const globalForRedis = globalThis as unknown as {
  redisPromise: Promise<Redis> | undefined;
};

/**
 * Initializes the Redis connection.
 * This function is called only once.
 */
async function initializeRedis(): Promise<Redis> {
  // 1. Waits for the async environment loader to finish
  const env = await getEnv();

  log.info(
    {
      nodeEnv: env.NODE_ENV,
    },
    'Initializing Redis connection...'
  );

  // 2. Create the Redis client
  // We don't use lazyConnect, so it connects immediately.
  const redis = new Redis(env.REDIS_URL, {
    // --- THIS IS THE IMPROVEMENT ---
    // Explicitly pass the password from the validated environment.
    // This overrides any password in the URL and is safer.
    password: env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redis.on('connect', () => {
    log.info('Redis client connected.');
  });
  redis.on('error', (error: Error) => {
    log.error({ err: error }, 'Redis client error');
  });
  redis.on('close', () => {
    log.warn('Redis client connection closed.');
  });

  // 3. Perform a test command
  await redis.ping();
  log.info('Redis connection established (PING successful).');
  return redis;
}

/**
 * The exported Redis promise.
 *
 * All parts of your application should `await redisPromise` to get a
 * resolved, ready-to-use Redis client instance.
 *
 * @example
 * import { redisPromise } from '@zouari-app/cache';
 * const redis = await redisPromise;
 * await redis.set('foo', 'bar');
 */
export const redisPromise = globalForRedis.redisPromise ?? initializeRedis();

// --- Fatal Error Handling ---
// If Redis fails to initialize, log it as a fatal error
// and exit the process.
redisPromise.catch((error: unknown) => {
  log.fatal(error, 'Failed to initialize Redis connection');
  process.exit(1);
});

// Ensure the singleton is preserved during HMR
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisPromise = redisPromise;
}
