import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * IMPORTANT: drizzle-kit CLI commands (generate, studio, push) read environment
 * variables directly from `process.env`. They do NOT use the async loader
 * from `@zouari-app/env`.
 *
 * Ensure `DATABASE_URL` is set in your shell environment BEFORE running
 * any `pnpm db:*` commands that invoke drizzle-kit.
 * (e.g., by running `source ../../load-secrets.sh` first, as per your monorepo docs).
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Use console.error for build-time tools, keep logger for runtime
  console.error(
    '🔴 Error: DATABASE_URL environment variable is not set.',
    '\nPlease set it in your environment before running drizzle-kit commands.',
    '\nExample: export DATABASE_URL="postgresql://user:pass@host:port/db"'
  );
  // Exit gracefully to prevent drizzle-kit from running with invalid config
  process.exit(1);
}

export default defineConfig({
  // Point to the 'index.ts' file inside the 'schema' directory.
  // This pattern is highly maintainable as your app grows,
  // allowing you to split tables into multiple files (e.g., users.ts, posts.ts)
  // and export them all from schema/index.ts.
  schema: './dist/schema/index.js',

  out: './drizzle', // Directory for migration files
  dialect: 'postgresql', // Specify the database dialect
  dbCredentials: {
    // Pass the validated URL
    url: databaseUrl,
  },

  // Enable verbose logging during CLI operations (good for debugging)
  verbose: true,
  // Enable strict mode for stricter checks (good practice)
  strict: true,
});
