import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import * as schema from './schema';

/**
 * Singleton promise for the database client.
 */
let dbPromise: Promise<Database> | null = null;

/**
 * Initialize database connection
 * Waits for environment to be loaded before connecting
 */
async function initializeDb() {
  // getEnv() returns the promise that resolves with the validated env
  const env = await getEnv();

  logger.info({
    poolMax: env.DATABASE_POOL_MAX,
  }, 'Initializing database connection...');

  const queryClient = postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX, // Max connections
    idle_timeout: 20,           // Seconds before releasing idle client
    connect_timeout: 10,        // Seconds to wait for connection
    prepare: false,             // Disable prepared statements (good for serverless/PgBouncer)
  });

  // Make Drizzle logger conditional on environment
  const db = drizzle(queryClient, {
    schema,
    logger: env.NODE_ENV === 'development',
  });

  logger.info('Database connection pool established');
  return db;
}

/**
 * Type export for the db instance
 */
export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Export a promise that resolves to the db instance.
 * This ensures we only initialize the client once.
 */
if (!dbPromise) {
  dbPromise = initializeDb();
}

export { dbPromise };

// Export schema for use in queries
export * from './schema';
