import cookie from '@fastify/cookie';
import { getEnvSync } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * This plugin registers @fastify/cookie to parse and sign cookies.
 * It is essential for Better Auth to manage session tokens.
 *
 * @see https://github.com/fastify/fastify-cookie
 */
export default fp(async (fastify: FastifyInstance) => {
  const env = getEnvSync();
  const log = logger.child({ plugin: 'cookie' });

  // The secret must match the one used in the auth package.
  const secret = env.SESSION_SECRET;
  if (!secret) {
    log.fatal('SESSION_SECRET is not defined. Cookie plugin cannot start.');
    throw new Error('SESSION_SECRET is not defined for cookie parser.');
  }

  await fastify.register(cookie, {
    secret: secret,
    parseOptions: {
      // This ensures the cookie is sent for all routes on your API's domain.
      path: '/',

      // Prevents client-side JavaScript (e.g., XSS) from reading the cookie.
      httpOnly: true,

      // Ensures the cookie is only sent over HTTPS.
      // We correctly enable this only in production.
      secure: env.NODE_ENV === 'production',

      // 'lax' is the best practice for auth. It prevents CSRF
      // while still allowing OAuth/SAML redirect flows to work.
      sameSite: 'lax',
    },
  });

  log.info('Cookie plugin registered successfully.');
});
