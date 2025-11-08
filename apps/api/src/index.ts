import { authPromise } from '@zouari-app/auth';
import { envPromise } from '@zouari-app/env';
import { logger } from '@zouari-app/logger';
import { initOpenTelemetry } from '@zouari-app/tracing';
import Fastify from 'fastify';
import FastifyBetterAuth from 'fastify-better-auth';

import cookiePlugin from './plugins/cookie.js';
import corsPlugin from './plugins/cors.js';
import helmetPlugin from './plugins/helmet.js';
import trpcPlugin from './plugins/trpc.js';

async function main() {
  try {
    // Await the pre-initialized envPromise at the *very* start.
    const env = await envPromise;
    logger.info({ env: env.NODE_ENV }, 'Environment loaded.');

    // Initialize tracing (if enabled)
    if (env.OTEL_ENABLED) {
      // Note: Add any other OTel env vars here (like auth headers)
      // if you add them to your envSchema.
      process.env.OTEL_SERVICE_NAME = env.OTEL_SERVICE_NAME || 'api';
      process.env.OTEL_COLLECTOR_URL = env.OTEL_EXPORTER_OTLP_ENDPOINT;
      // ---------------------------------

      initOpenTelemetry(env.OTEL_SERVICE_NAME || 'api');
      logger.info('OpenTelemetry initialized.');
    }

    // Await the auth client
    const auth = await authPromise;
    logger.info('Auth client initialized.');

    // Create Fastify instance
    const server = Fastify({
      logger: logger,
      trustProxy: true,
      maxParamLength: 5000,
    });

    // Register plugins
    await server.register(cookiePlugin);
    await server.register(corsPlugin);
    await server.register(helmetPlugin);

    // This automatically creates all /api/auth/* routes for you.
    await server.register(FastifyBetterAuth, { auth });

    // Health check endpoint
    server.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      };
    });

    // Register tRPC plugin
    await server.register(trpcPlugin);

    // Use port/host from the validated env
    const port = env.API_PORT;
    const host = env.API_HOST;
    await server.listen({ port, host });

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await server.close();
        process.exit(0);
      });
    }
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start API server');
    process.exit(1);
  }
}

main();
