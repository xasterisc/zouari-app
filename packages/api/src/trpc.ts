import { initTRPC } from '@trpc/server';
import type { Session, User } from '@zouari-app/auth';
import { AuthenticationError } from '@zouari-app/errors';
import { ZodError, z } from 'zod';
import type { Context } from './context.js';

const t = initTRPC.context<Context>().create({
  /**
   * Zod error formatter.
   * This passes Zod validation errors to the client.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? z.treeifyError(error.cause) : null,
      },
    };
  },
});

/**
 * Reusable tRPC middleware.
 */
export const middleware = t.middleware;

/**
 * Export router and procedure helpers.
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure that requires authentication.
 *
 * This middleware checks if a user is authenticated and throws a
 * consistent 'AuthenticationError' if not.
 *
 * It also refines the context type for all downstream resolvers,
 * ensuring that `ctx.session` and `ctx.user` are non-null.
 */
export const protectedProcedure = t.procedure.use(
  middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
      // --- THIS IS THE IMPROVEMENT ---
      // Use your custom error class for consistency
      throw new AuthenticationError('Authentication required');
      // -----------------------------
    }

    return next({
      ctx: {
        ...ctx,
        // Refine context types for downstream resolvers
        session: ctx.session,
        user: ctx.user,
      } as Context & { session: Session; user: User },
    });
  })
);
