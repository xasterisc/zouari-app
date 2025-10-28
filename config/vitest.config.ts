import { defineConfig } from 'vitest/config';

/**
 * Base Vitest configuration shared across the monorepo.
 * Packages can extend this and override settings as needed.
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    // Allows using Vitest globals (describe, it, expect, etc.) without importing
    globals: true,
    // Default environment for tests (can be overridden per package, e.g., 'jsdom' for UI tests)
    environment: 'node',
    // Coverage configuration using V8 (Node.js built-in)
    coverage: {
      provider: 'v8',
      // Generate reports in multiple formats
      reporter: ['text', 'json', 'html'],
      // Exclude common files/patterns from coverage reports
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.{next,output,turbo}/**',
        '**/*.config.*',     // Config files (js, ts, mjs, etc.)
        '**/*.d.ts',         // Type definition files
        '**/*.{test,spec}.*', // Test files
        '**/__tests__/**',   // Test directories
        '**/types.ts',       // Files named 'types.ts'
        '**/index.ts',       // Barrel files (often just re-exports)
        '**/main.ts',        // Entry point files (often just setup)
      ],
      // Optional: Set thresholds for coverage checks later if desired
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
      cleanOnRerun: true,
      clean: true,
    },
    // Optional: Add common setup files if needed later
    // setupFiles: ['../../config/vitest.setup.ts'],
  },
});
