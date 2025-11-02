/**
 * --- @zouari-app/validation ---
 *
 * This is the main entry point for the centralized validation package.
 *
 * It exports:
 * 1. Environment Schemas: `secretZeroSchema`, `envSchema`
 * 2. API Schemas: A namespaced `apiValidation` object
 * 3. All API Types
 */

// Export the namespaced apiValidation object and all API types
export * from './api';

// Export all environment variable schemas and types
export * from './env';
