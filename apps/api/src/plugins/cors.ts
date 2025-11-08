import cors from '@fastify/cors';
import { getEnvSync } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

/**
 * This plugin configures Cross-Origin Resource Sharing (CORS) for the API.
 * It is critical for security, ensuring that only trusted web frontends
 * can communicate with the API.
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fastifyPlugin(async (fastify: FastifyInstance) => {
  const env = getEnvSync();
  const log = logger.child({ plugin: 'cors' });

  await fastify.register(cors, {
    // Use the specific env var we defined for this
    origin: env.API_CORS_ORIGIN,

    // Required to allow the browser to send auth cookies
    credentials: true,

    // Explicitly allow headers used by our tRPC client
    allowedHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
  });

  log.info(`CORS plugin registered. Allowing origin: ${env.API_CORS_ORIGIN}`);
});
