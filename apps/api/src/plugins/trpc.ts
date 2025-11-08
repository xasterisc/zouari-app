import { type FastifyTRPCPluginOptions, fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { type AppRouter, appRouter, createContext } from '@zouari-app/api';
import { logger } from '@zouari-app/logger';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

/**
 * This plugin registers the tRPC adapter for Fastify, connecting
 * your tRPC router (@zouari-app/api) to the web server.
 *
 * It includes an enhanced, enterprise-grade error logger.
 */
export default fp(async (fastify: FastifyInstance) => {
  const log = logger.child({ plugin: 'trpc' });

  const trpcPluginOptions: FastifyTRPCPluginOptions<AppRouter> = {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: async (opts) => {
        return createContext(opts);
      },

      /**
       * --- ENHANCED ERROR LOGGING ---
       * This is a critical observability point.
       */
      onError(opts) {
        const { path, error, type, ctx, input } = opts;

        // Determine the log level based on the error
        const level = error.code === 'INTERNAL_SERVER_ERROR' ? 'error' : 'warn';

        log[level](
          {
            // --- User Context ---
            // Log the user ID if a user was authenticated on this request
            userId: ctx?.user?.id,

            // --- Request Context ---
            path,
            type,
            input, // Log the input data that caused the error

            // --- Error Details ---
            code: error.code,
            error: error.message,
            // Log the full stack trace in development for easier debugging
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          },
          `tRPC ${level} on path '${path}': ${error.message}`
        );
      },
    },
  };

  // Pass the fully-typed options object to the register function
  await fastify.register(fastifyTRPCPlugin, trpcPluginOptions);

  log.info('tRPC plugin registered successfully on /trpc');
});
