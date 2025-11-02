import { InfisicalSDK, type Secret } from '@infisical/sdk';
import { InternalServerError, ServiceUnavailableError } from '@zouari-app/errors';
import { logger } from '@zouari-app/logger';
import { type Env, envSchema, type SecretZeroEnv, secretZeroSchema } from '@zouari-app/validation';
import { z } from 'zod';

/*
 * NOTE: This implementation is a "Secure by Design" and "Zero Trust" model by:
 *
 * 1.  Validating "Secret Zero" (Infisical creds) from `process.env` first.
 * 2.  Fetching all other secrets from Infisical.
 * 3.  Merging `process.env` (for non-secret vars like NODE_ENV, PORT)
 * with the fetched secrets.
 * 4.  Validating the *complete, merged* object against the full `envSchema`.
 *
 * This ensures that the application *cannot* start with an invalid or
 * incomplete configuration, whether from `process.env` or Infisical.
 */

// --- Module-level cache and singleton ---

/**
 * A private in-memory cache for the loaded environment.
 * @private
 */
let envCache: Env | null = null;

/**
 * A singleton promise to ensure we only load the environment once.
 * This prevents race conditions during application startup.
 * @private
 */
let _envPromise: Promise<Env> | null = null;

/**
 * A dedicated logger for this module.
 * @private
 */
const log = logger.child({ module: 'env-loader' });

/**
 * The core function to load, fetch, and validate the complete environment.
 *
 * @returns {Promise<Env>} A promise that resolves to the fully validated environment.
 * @throws {InternalServerError} If "Secret Zero" validation fails.
 * @throws {ServiceUnavailableError} If Infisical connection or fetching fails.
 * @throws {InternalServerError} If the final, full validation fails.
 * @private
 */
async function loadAndValidateEnvironment(): Promise<Env> {
  log.info('Starting environment validation and loading...');

  // --- 1. Validate "Secret Zero" (Bootstrap Credentials) ---
  let secretZero: SecretZeroEnv;
  try {
    // We only parse `process.env` for the bootstrap credentials.
    secretZero = secretZeroSchema.parse(process.env);
    log.info('Successfully validated "Secret Zero" (Infisical credentials).');
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.error(
        { errors: err.issues },
        '❌ Missing or invalid "Secret Zero" credentials (schema validation failed):'
      );
      for (const issue of err.issues) {
        log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      log.error({ err }, 'An unexpected error occurred during "Secret Zero" validation');
    }
    throw new InternalServerError('Missing or invalid Infisical credentials. Check server logs.');
  }

  // Destructure validated "Secret Zero" for use
  const {
    INFISICAL_PROJECT_ID,
    INFISICAL_ENVIRONMENT,
    INFISICAL_CLIENT_ID,
    INFISICAL_CLIENT_SECRET,
    INFISICAL_SITE_URL,
  } = secretZero;

  // --- 2. Fetch Application Secrets from Infisical ---
  let secretsResponse: Secret[] = [];
  try {
    log.info(
      {
        projectId: INFISICAL_PROJECT_ID,
        environment: INFISICAL_ENVIRONMENT,
        siteUrl: INFISICAL_SITE_URL,
      },
      'Initializing Infisical client and authenticating...'
    );

    const client = new InfisicalSDK({
      // Use the validated URL, or default if it was optional and absent
      siteUrl: INFISICAL_SITE_URL || 'https://infisical.zouari.org',
    });

    await client.auth().universalAuth.login({
      clientId: INFISICAL_CLIENT_ID,
      clientSecret: INFISICAL_CLIENT_SECRET,
    });
    log.info('Infisical client authenticated successfully.');

    log.info('Fetching secrets from Infisical...');
    secretsResponse = await client.secrets().listSecretsWithImports({
      projectId: INFISICAL_PROJECT_ID,
      environment: INFISICAL_ENVIRONMENT,
    });
    log.info(`Successfully fetched ${secretsResponse.length} secrets from Infisical.`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Type-safe error handling for 'errorStatus'
    let errorStatus: unknown = 'N/A';
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response: unknown }).response;
      if (response && typeof response === 'object' && 'status' in response) {
        errorStatus = (response as { status: unknown }).status;
      }
    }

    log.error(
      {
        errorMessage,
        errorStatus,
        errorDetails: secretZero.NODE_ENV === 'development' ? error : undefined,
      },
      'Failed to authenticate with or fetch secrets from Infisical'
    );
    throw new ServiceUnavailableError('Could not connect to or fetch secrets from Infisical.');
  }

  // --- 3. Convert Fetched Secrets to an Object ---
  const secretsObject = Object.fromEntries(
    secretsResponse.map((secret) => [secret.secretKey, secret.secretValue])
  );

  // --- 4. Merge and Validate Full Environment ---
  // This is the "Zero Trust" model: we do NOT mutate `process.env`.
  // We merge `process.env` (for NODE_ENV, LOG_LEVEL, API_PORT etc.)
  // with the fetched `secretsObject` (for DATABASE_URL, etc.).
  // The fetched secrets (secretsObject) take precedence.
  const rawEnv = {
    ...process.env,
    ...secretsObject,
  };

  try {
    // We now parse the *complete* object against the *full* envSchema.
    const validatedEnv = envSchema.parse(rawEnv);
    log.info('✅ Environment variables loaded and validated successfully (Zero Trust Model).');
    return validatedEnv;
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.error(
        { errors: err.issues },
        '❌ Invalid environment variables (full schema validation failed):'
      );
      for (const issue of err.issues) {
        // Log only missing or invalid *required* variables
        if (!issue.path.join('.').startsWith('INFISICAL_')) {
          log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        }
      }
    } else {
      log.error({ err }, 'An unexpected error occurred during full environment validation');
    }
    throw new InternalServerError('Failed to validate environment variables. Check server logs.');
  }
}

// --- Public API ---

/**
 * Asynchronously gets the fully loaded and validated environment.
 * This function is a singleton and will only load the environment once.
 *
 * @example
 * const env = await getEnv();
 * const dbUrl = env.DATABASE_URL;
 *
 * @returns {Promise<Env>} A promise that resolves to the read-only environment object.
 */
export function getEnv(): Promise<Env> {
  // 1. If cache exists, return it.
  if (envCache) {
    return Promise.resolve(envCache);
  }
  // 2. If promise is already in flight, return it.
  if (_envPromise) {
    return _envPromise;
  }
  // 3. Otherwise, create the promise, cache it, and return it.
  _envPromise = loadAndValidateEnvironment()
    .then((loadedEnv) => {
      envCache = loadedEnv; // Cache the result
      log.info('Environment successfully cached.');
      return loadedEnv;
    })
    .catch((error) => {
      _envPromise = null; // Clear promise on error to allow retry
      log.fatal({ err: error }, 'Failed to load environment. Caching promise cleared.');
      throw error; // Re-throw the error
    });

  return _envPromise;
}

/**
 * A pre-initialized singleton promise for the environment.
 * This is the recommended way to initialize your application.
 *
 * @example
 * // In your application's main entry point (e.g., api/src/server.ts)
 * import { envPromise } from '@zouari-app/env';
 *
 * async function startServer() {
 * try {
 * const env = await envPromise;
 * // Now we know the env is loaded and valid.
 * const server = new Server(env);
 * server.start();
 * } catch (error) {
 * log.fatal(error, 'Failed to start server');
 * process.exit(1);
 * }
 * }
 * startServer();
 */
export const envPromise = getEnv();

/**
 * Synchronously gets the validated environment.
 * This function will **throw an error** if the environment has not been
 * loaded yet via `getEnv()` or `await envPromise`.
 *
 * This is useful for accessing the environment in modules that are
 * imported *after* the initial `await envPromise` has resolved.
 *
 * @example
 * // In a service file (e.g., api/src/services/user.service.ts)
 * import { getEnvSync } from '@zouari-app/env';
 *
 * const env = getEnvSync(); // This is safe *after* startup
 * const sessionSecret = env.SESSION_SECRET;
 *
 * @returns {Env} The read-only environment object.
 * @throws {InternalServerError} If accessed before `envPromise` resolves.
 */
export function getEnvSync(): Env {
  if (!envCache) {
    log.error('Attempted synchronous access to environment before it was loaded.');
    throw new InternalServerError(
      'Environment variables accessed synchronously before `envPromise` resolved. Ensure `await envPromise;` is called at app startup.'
    );
  }
  return envCache;
}

log.info('Environment·loader·module·initialized.·Awaiting·first·call·to·getEnv()·or·envPromise.');
