import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Base Vitest configuration shared across the monorepo.
 * Packages can extend this and override settings as needed.
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.{next,output,turbo}/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/*.{test,spec}.*',
        '**/__tests__/**',
        '**/types.ts',
        '**/index.ts',
        '**/main.ts',
      ],
      cleanOnRerun: true,
      clean: true,
    },
    // setupFiles: ['../../config/vitest.setup.ts'],
  },

  // This is necessary for tests to find imports like '@zouari-app/db'
  resolve: {
    alias: [
      {
        // This regex matches any import starting with '@zouari-app/'
        // and maps it to the 'src' folder of the corresponding package.
        // e.g., '@zouari-app/db' -> '.../packages/db/src'
        find: /@zouari-app\/(.*)/,
        replacement: path.resolve(__dirname, '../packages/$1/src'),
      },
    ],
  },
});
