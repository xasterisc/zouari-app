import { dbPromise } from '@zouari-app/db';
import { envPromise } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import { hash, verify } from 'argon2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

// Type alias for the 'betterAuth' instance
export type Auth = Awaited<ReturnType<typeof initializeAuth>>;

/**
 * Singleton pattern for the Auth client.
 * We use 'globalThis' to ensure HMR-safety in development.
 */
const globalForAuth = globalThis as unknown as {
  authPromise: Promise<Auth> | undefined;
};

/**
 * Initializes the Better Auth instance.
 * This function is called only once.
 */
async function initializeAuth() {
  // 1. Await the async dependencies (env and db)
  const [env, db] = await Promise.all([envPromise, dbPromise]);
  const log = logger.child({ module: 'auth-init' });
  log.info('Initializing Better Auth...');

  // 2. Create the auth instance using the resolved dependencies
  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: env.NODE_ENV === 'production',
      minPasswordLength: 10,
      maxPasswordLength: 128,

      password: {
        hash: async (password) => {
          // 'argon2id' is the default type for the 'hash' function
          return hash(password, { type: 2 }); // type 2 is argon2id
        },
        verify: async ({ hash, password }) => {
          return verify(hash, password);
        },
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || '',
        clientSecret: env.GOOGLE_CLIENT_SECRET || '',
        enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID || '',
        clientSecret: env.GITHUB_CLIENT_SECRET || '',
        enabled: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      },
    },
    magicLink: {
      enabled: !!(env.SMTP_HOST && env.SMTP_USER),
      sendMagicLink: async ({
        email,
        url,
        token: _token,
      }: {
        email: string;
        url: string;
        token: string;
      }) => {
        log.info({ email, url }, 'Sending magic link');
        // TODO: Plug this into your `apps/worker` BullMQ 'email' queue
        if (env.NODE_ENV === 'development') {
          log.info(`Magic link URL: ${url}`);
        }
      },
    },
    twoFactor: {
      enabled: true,
      issuer: 'ZouariApp',
    },
    session: {
      expiresIn: env.SESSION_EXPIRES_IN,
      updateAge: 60 * 60 * 24, // Update session daily
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },
    user: {
      additionalFields: {},
      deleteUser: {
        enabled: true,
      },
      changeEmail: {
        enabled: true,
        requireEmailVerification: env.NODE_ENV === 'production',
      },
      changePassword: {
        enabled: true,
      },
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
      useSecureCookies: env.NODE_ENV === 'production',
      generateId: () => crypto.randomUUID(),
      cookieSameSite: 'lax',
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
    },
    baseURL: env.NEXT_PUBLIC_API_URL,
    secret: env.SESSION_SECRET,
    logger: {
      level: env.NODE_ENV === 'production' ? 'error' : 'debug',
      disabled: false,
    },
  });

  log.info('Better Auth initialized successfully.');
  return auth;
}

/**
 * The exported Auth promise.
 *
 * All parts of your application (like your Fastify server)
 * should `await authPromise` to get a resolved, ready-to-use
 * Better Auth client instance.
 *
 * @example
 * import { authPromise } from '@zouari-app/auth';
 * const auth = await authPromise;
 * server.all('/api/auth/*', auth.handler);
 */
export const authPromise = globalForAuth.authPromise ?? initializeAuth();

// --- Fatal Error Handling ---
authPromise.catch((error: unknown) => {
  logger.fatal(error, 'Failed to initialize Better Auth');
  process.exit(1);
});

// Ensure the singleton is preserved during HMR
if (process.env.NODE_ENV !== 'production') {
  globalForAuth.authPromise = authPromise;
}

// Export the core types from better-auth for convenience
export type { Session, User } from 'better-auth';
