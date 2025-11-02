import { z } from 'zod';

/**
 * Validates the "Secret Zero" environment variables needed to initialize
 * the Infisical SDK for Machine Identity (MI) authentication.
 *
 * These are the ONLY variables expected to be in `process.env`.
 */
export const secretZeroSchema = z.object({
  // --- Application Core ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // --- Infisical (Secret Zero - Machine Identity) ---
  INFISICAL_PROJECT_ID: z.string().min(1, 'INFISICAL_PROJECT_ID is required'),
  INFISICAL_ENVIRONMENT: z.string().min(1, 'INFISICAL_ENVIRONMENT is required').default('dev'),
  INFISICAL_CLIENT_ID: z.string().min(1, 'INFISICAL_CLIENT_ID is required'),
  INFISICAL_CLIENT_SECRET: z.string().min(1, 'INFISICAL_CLIENT_SECRET is required'),
  INFISICAL_SITE_URL: z.url({ message: 'INFISICAL_SITE_URL must be a valid URL' }).optional(), // Optional, but recommended
});

/**
 * Represents the "Secret Zero" configuration.
 */
export type SecretZeroEnv = z.infer<typeof secretZeroSchema>;

/**
 * Centralized Zod schema for ALL environment variables,
 * including those fetched from Infisical.
 *
 * This schema validates the *complete* configuration object
 * after secrets have been fetched.
 */
export const envSchema = z.object({
  // --- Database (Fetched) ---
  DATABASE_URL: z.url({ message: 'DATABASE_URL must be a valid connection URL' }),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),

  // --- Redis (Fetched) ---
  REDIS_URL: z.url({ message: 'REDIS_URL must be a valid Redis connection URL' }),
  REDIS_PASSWORD: z.string().optional(),

  // --- Authentication (Fetched) ---
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_EXPIRES_IN: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7), // 7 days in seconds

  // --- OAuth Providers (Fetched, Optional) ---
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // --- Email (Fetched, Optional) ---
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.email({ message: 'EMAIL_FROM must be a valid email' }).optional(),

  // --- API Server ---
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  API_CORS_ORIGIN: z.url({
    message: 'API_CORS_ORIGIN must be a valid URL',
  }),

  // --- Web App (Next.js) ---
  // Note: NEXT_PUBLIC_ vars must be prefixed!
  NEXT_PUBLIC_API_URL: z.url({
    message: 'NEXT_PUBLIC_API_URL must be a valid URL',
  }),

  // --- Worker ---
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(5),

  // --- Observability (OpenTelemetry - Optional, Fetched) ---
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .url({ message: 'OTEL_EXPORTER_OTLP_ENDPOINT must be a valid URL' })
    .optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
});

/**
 * Represents the complete, validated environment, including fetched secrets.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Represents the combined environment: the Secret Zero "inputs"
 * and the complete "output" schema.
 *
 * This is useful for the config package that will
 * 1. Parse `secretZeroSchema` from `process.env`
 * 2. Fetch secrets using those credentials
 * 3. Merge and parse the final config against `envSchema`
 */
export type FullEnv = Env & SecretZeroEnv;
