import { getEnv } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js'; // Use .js extension for relative ESM imports

/**
 * Type export for the Drizzle database instance.
 */
export type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Singleton pattern for the database client.
 * We use 'globalThis' to ensure the promise is truly a singleton
 * across Hot Module Replacement (HMR) reloads in development.
 */
const globalForDb = globalThis as unknown as {
  dbPromise: Promise<Database> | undefined;
};

/**
 * Initializes the database connection pool.
 * This function is called only once.
 */
async function initializeDb() {
  // Waits for the async environment loader to finish
  const env = await getEnv();

  logger.info(
    {
      poolMax: env.DATABASE_POOL_MAX,
      nodeEnv: env.NODE_ENV,
    },
    'Initializing database connection pool...'
  );

  // Create the connection pool
  const pool = postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX, // Max connections
    idle_timeout: 20, // Seconds before releasing idle client
    connect_timeout: 10, // Seconds to wait for connection
    prepare: false, // Disable prepared statements (good for serverless/PgBouncer)
  });

  // Create the Drizzle client
  const db = drizzle(pool, {
    schema,
    // Enable Drizzle logger only in development
    logger: env.NODE_ENV === 'development',
  });

  logger.info('Database connection pool established.');
  return db;
}

/**
 * The exported database promise.
 *
 * All parts of your application should `await dbPromise` to get a
 * resolved, ready-to-use Drizzle client instance.
 *
 * @example
 * import { dbPromise } from '@zouari-app/db';
 * const db = await dbPromise;
 * const users = await db.query.users.findMany();
 */
export const dbPromise = globalForDb.dbPromise ?? initializeDb();

// --- Fatal Error Handling ---
// If the database fails to initialize, log it as a fatal error
// and exit the process. An app without a DB is in a broken state.
dbPromise.catch((error) => {
  logger.fatal(error, 'Failed to initialize database connection');
  // Exit gracefully
  process.exit(1);
});

// Ensure the singleton is preserved during HMR
if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPromise = dbPromise;
}

// Export schema for use in queries
// e.g., import { users } from '@zouari-app/db/schema'
export * from './schema/index.js';
