import { z } from 'zod';

/**
 * Centralized Zod schema for ALL environment variables.
 * This schema is used by packages/env to validate secrets fetched/injected at runtime.
 */
export const envSchema = z.object({
  // --- Application Core ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // --- Infisical (Secret Zero - injected via runtime environment) ---
  INFISICAL_PROJECT_ID: z.string().min(1, 'INFISICAL_PROJECT_ID is required'),
  INFISICAL_ENVIRONMENT: z.string().min(1, 'INFISICAL_ENVIRONMENT is required').default('dev'),
  INFISICAL_TOKEN: z.string().min(1, 'INFISICAL_TOKEN is required'),
  // Points to your central instance. Use z.url() for validation.
  INFISICAL_SITE_URL: z.url('INFISICAL_SITE_URL must be a valid URL').optional(), // Optional, defaults used in packages/env

  // --- Database (Fetched from Infisical) ---
  // Standard PostgreSQL URL format: postgresql://user:password@host:port/dbname
  DATABASE_URL: z.url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // --- Redis (Fetched from Infisical) ---
  // Standard Redis URL format: redis://:password@host:port
  REDIS_URL: z.url('REDIS_URL must be a valid Redis connection URL'),
  REDIS_PASSWORD: z.string().optional(), // Can often be included in REDIS_URL

  // --- Authentication (Fetched from Infisical) ---
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_EXPIRES_IN: z.coerce.number().int().positive().default(60 * 60 * 24 * 7), // 7 days

  // --- API Server ---
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  API_HOST: z.string().default('0.0.0.0'), // Listens on all interfaces in container
  // Should be fetched from Infisical for prod/staging. Default is for local dev.
  API_CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // --- Web App (Next.js) ---
  // Default suitable for local dev. Should be overridden in prod via Infisical
  // to point to the API's public URL or internal Docker hostname.
  NEXT_PUBLIC_API_URL: z.url('NEXT_PUBLIC_API_URL must be a valid URL').default('http://localhost:3001'),

  // --- Worker ---
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(5),

  // --- Observability (OpenTelemetry - Optional, Fetched from Infisical) ---
  // Standard OTLP HTTP endpoint format, e.g., http://otel-collector:4318
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url('OTEL_EXPORTER_OTLP_ENDPOINT must be a valid URL').optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
});

// Export the inferred type for use in other packages
export type Env = z.infer<typeof envSchema>;
