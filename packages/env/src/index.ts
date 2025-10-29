import { InfisicalSDK, type Secret } from '@infisical/sdk';
import { InternalServerError, ServiceUnavailableError } from '@zouari-app/errors';
import { logger } from '@zouari-app/logger';
import type { Env } from '@zouari-app/validation';
import { envSchema, z } from '@zouari-app/validation';

let envCache: Env | null = null;
let _envPromise: Promise<Env> | null = null;
const log = logger.child({ module: 'env-loader' });

async function loadAndValidateEnvironment(): Promise<Env> {
  // 1. Read Machine Identity Credentials
  const {
    INFISICAL_PROJECT_ID,
    INFISICAL_ENVIRONMENT = 'dev',
    INFISICAL_CLIENT_ID,
    INFISICAL_CLIENT_SECRET,
    INFISICAL_SITE_URL = 'https://infisical.zouari.org',
  } = process.env;

  // 2. Validate Credentials
  if (!INFISICAL_PROJECT_ID || !INFISICAL_CLIENT_ID || !INFISICAL_CLIENT_SECRET) {
    log.error(
      {
        hasProjectId: !!INFISICAL_PROJECT_ID,
        hasClientId: !!INFISICAL_CLIENT_ID,
        hasClientSecret: !!INFISICAL_CLIENT_SECRET ? '***' : 'MISSING',
      },
      'Missing required Infisical Machine Identity credentials in environment',
    );
    throw new InternalServerError(
      'Missing Infisical credentials: INFISICAL_PROJECT_ID, INFISICAL_CLIENT_ID, and INFISICAL_CLIENT_SECRET must be set via environment variables.',
    );
  }

  let secretsResponse: Secret[] = []; // Array to hold secrets
  try {
    log.info(
      {
        projectId: INFISICAL_PROJECT_ID,
        environment: INFISICAL_ENVIRONMENT,
        siteUrl: INFISICAL_SITE_URL,
      },
      'Initializing Infisical client and authenticating...',
    );

    // 3. Initialize Client
    const client = new InfisicalSDK({
      siteUrl: INFISICAL_SITE_URL,
    });

    // 4. Authenticate using Machine Identity
    await client.auth().universalAuth.login({
      clientId: INFISICAL_CLIENT_ID,
      clientSecret: INFISICAL_CLIENT_SECRET,
    });
    log.info('Infisical client authenticated successfully.');

    log.info('Fetching secrets from Infisical...');

    // 5. Fetch Secrets
    // This method returns the Secret[] array directly.
    secretsResponse = await client.secrets().listSecretsWithImports({
      projectId: INFISICAL_PROJECT_ID,
      environment: INFISICAL_ENVIRONMENT,
      // path: '/', // path is optional, omitting fetches from root
    });

    log.info(`Successfully fetched ${secretsResponse.length} secrets from Infisical.`);

  } catch (error: any) {
    log.error(
      {
        errorMessage: error?.message,
        errorStatus: error?.response?.status,
        errorDetails: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      'Failed to authenticate with or fetch secrets from Infisical',
    );
    throw new ServiceUnavailableError('Could not connect to or fetch secrets from Infisical.');
  }

  // 6. Convert Fetched Secrets to Object
  const secretsObject = secretsResponse.reduce(
    (acc: Record<string, string>, secret: Secret) => {
      // Use secretKey and secretValue
      acc[secret.secretKey] = secret.secretValue;
      return acc;
    },
    {} as Record<string, string>,
  );

  // 7. Merge and Validate
  const rawEnv = {
    ...process.env, // process.env first (lowest priority)
    ...secretsObject, // Infisical secrets override process.env
  };

  try {
    const validatedEnv = envSchema.parse(rawEnv);
    log.info('Environment variables validated successfully.');
    return validatedEnv;
  } catch (err) {
    // ... (validation error logging) ...
     if (err instanceof z.ZodError) {
      log.error('❌ Invalid environment variables (schema validation failed):');
      for (const issue of err.issues) {
        log.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
    } else {
      log.error({ err }, 'An unexpected error occurred during environment validation');
    }
    throw new InternalServerError('Failed to validate environment variables.');
  }
}

// --- Getter functions ---
export function getEnv(): Promise<Env> {
  if (envCache) { return Promise.resolve(envCache); }
  if (!_envPromise) {
    _envPromise = loadAndValidateEnvironment().then((loadedEnv) => {
      envCache = loadedEnv;
      return loadedEnv;
    }).catch((error) => {
      _envPromise = null;
      throw error;
    });
  }
  return _envPromise;
}
export const envPromise = getEnv();
export function getEnvSync(): Env {
  if (!envCache) {
    log.error('Attempted synchronous access to environment before it was loaded.');
    throw new InternalServerError(
      'Environment variables accessed synchronously before `envPromise` resolved. Ensure `await envPromise;` is called at app startup.',
    );
  }
  return envCache;
}

log.info('Environment loader module initialized. Awaiting first call to getEnv() or envPromise.');
