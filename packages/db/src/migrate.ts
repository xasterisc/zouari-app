/**
 * --------------------------------------------------------------------------
 * @Zouari-app/db
 * --------------------------------------------------------------------------
 * @fileoverview
 * This script runs database migrations using Drizzle ORM.
 *
 * @version 2.0.0
 * @see [Drizzle ORM](https://orm.drizzle.team)
 *
 * @remarks
 * This script is intended to be run from the command line, typically via:
 * `pnpm --filter @zouari-app/db db:migrate`
 *
 * It uses the async `@zouari-app/env` loader, which means it expects
 * Infisical credentials to be injected into the environment to fetch
 * the `DATABASE_URL`.
 */

import { getEnv } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Runs the database migration process.
 */
async function runMigrations() {
  logger.info('Database migration script starting...');

  try {
    // 1. Await the validated environment from the async loader
    const env = await getEnv();
    logger.info('Environment loaded successfully.');

    // 2. Create a dedicated, single-connection client for migrations.
    // We do not need a full connection pool, just a single connection
    // to run the migration commands sequentially.
    const migrationClient = postgres(env.DATABASE_URL, {
      max: 1,
      idle_timeout: 10, // Short timeout for a single-use client
      connect_timeout: 10,
    });

    logger.info('Migration database client connected.');

    // 3. Initialize Drizzle with the migration client
    const db = drizzle(migrationClient);

    // 4. Run the migrations
    logger.info("Applying migrations from './drizzle' folder...");
    await migrate(db, {
      migrationsFolder: './drizzle', // Points to the generated SQL files
    });

    logger.info('✅ Database migration completed successfully.');

    // 5. Explicitly close the connection and exit gracefully
    await migrationClient.end();
    process.exit(0);
  } catch (error) {
    // 6. Log any errors and exit with a failure code
    logger.error(error, '🔴 Database migration failed.');
    process.exit(1);
  }
}

// --- Execute the script ---
runMigrations();
