import { z } from 'zod';

/**
 * Centralized Zod schema for ALL environment variables.
 * Updated for Infisical SDK v4 Machine Identity auth.
 */
export const envSchema = z.object({
  // --- Application Core ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // --- Infisical (Secret Zero - Machine Identity) ---
  INFISICAL_PROJECT_ID: z.string().min(1, 'INFISICAL_PROJECT_ID is required'),
  INFISICAL_ENVIRONMENT: z.string().min(1, 'INFISICAL_ENVIRONMENT is required').default('dev'),
  // Use Machine Identity Credentials (Client ID/Secret)
  INFISICAL_CLIENT_ID: z.string().min(1, 'INFISICAL_CLIENT_ID is required'),
  INFISICAL_CLIENT_SECRET: z.string().min(1, 'INFISICAL_CLIENT_SECRET is required'),
  INFISICAL_SITE_URL: z.url('INFISICAL_SITE_URL must be a valid URL').optional(),

  // --- Database (Fetched from Infisical) ---
  DATABASE_URL: z.url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // --- Redis (Fetched from Infisical) ---
  REDIS_URL: z.url('REDIS_URL must be a valid Redis connection URL'),
  REDIS_PASSWORD: z.string().optional(),

  // --- Authentication (Fetched from Infisical) ---
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_EXPIRES_IN: z.coerce.number().int().positive().default(60 * 60 * 24 * 7), // 7 days

  // --- API Server ---
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  API_CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // --- Web App (Next.js) ---
  NEXT_PUBLIC_API_URL: z.url('NEXT_PUBLIC_API_URL must be a valid URL').default('http://localhost:3001'),

  // --- Worker ---
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(5),

  // --- Observability (OpenTelemetry - Optional, Fetched from Infisical) ---
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url('OTEL_EXPORTER_OTLP_ENDPOINT must be a valid URL').optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
