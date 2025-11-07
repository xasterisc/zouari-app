/**
 * --------------------------------------------------------------------------
 * DATABASE SCHEMA - BARREL FILE
 * --------------------------------------------------------------------------
 * This file imports all individual schema definitions (tables, enums, relations)
 * and exports them as a single, unified 'schema' object.
 *
 * This 'schema' object is used by:
 * 1. The main Drizzle client (in src/index.ts)
 * 2. Drizzle Kit for generating migrations (drizzle.config.ts)
 *
 * It also re-exports all types and definitions for easy importing
 * in other packages, e.g.:
 * `import { users, type User } from '@zouari-app/db/schema'`
 */

// Import and re-export all auth-related schemas and types
export * from './auth.js';

// Import the bundled schema object from 'auth.ts'
import { authSchema } from './auth.js';

// --- FUTURE IMPORTS ---
// As your application grows, you will add more schema files
// and import them here.
//
// e.g.:
// import { postsSchema } from "./posts.js";
// export * from "./posts.js";
//
// import { productsSchema } from "./products.js";
// export * from "./products.js";
// ------------------------

/**
 * The single, unified schema object that contains all tables, enums,
 * and relations for the entire application.
 */
export const schema = {
  ...authSchema,

  // ... e.g., ...postsSchema,
  // ... e.g., ...productsSchema,
};
