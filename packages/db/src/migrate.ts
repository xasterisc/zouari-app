import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { getEnv } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';

/**
 * Run database migrations
 * This script is executed via: pnpm --filter @zouari-app/db db:migrate
 */
async function runMigrations() {
  try {
    // 1. Await the validated environment
    const env = await getEnv();

    logger.info('Starting database migration...');

    // 2. Create a dedicated, single-connection client for migrations
    const migrationClient = postgres(env.DATABASE_URL, {
      max: 1, // Don't need a pool for migrations
    });

    // 3. Initialize Drizzle with the migration client
    const db = drizzle(migrationClient);

    // 4. Run the migrations
    await migrate(db, {
      migrationsFolder: './drizzle', // Point to the generated migrations
    });

    logger.info('Migration completed successfully');

    // 5. Close the connection and exit
    await migrationClient.end();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  }
}

runMigrations();
