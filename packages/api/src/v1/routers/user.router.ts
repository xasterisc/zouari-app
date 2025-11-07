import { TRPCError } from '@trpc/server';
import { users } from '@zouari-app/db';
import {
  idSchema,
  userListResponseSchema,
  userResponseSchema,
  userUpdateProfileSchema,
} from '@zouari-app/validation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../../trpc.js';

export const userRouter = router({
  /**
   * Get current authenticated user
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user is already available and type-safe from protectedProcedure
    return ctx.user;
  }),

  /**
   * Get user by ID (public)
   */
  getById: publicProcedure
    .input(
      // --- FIX 3: Use a valid input schema ---
      z.object({ id: idSchema })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
        columns: {
          // --- FIX 4: Select fields that actually exist ---
          id: true,
          name: true,
          email: true,
          avatarUrl: true, // Not 'image'
          createdAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // --- FIX 5: Use response schema for security ---
      // This ensures we only return fields defined in the public schema
      return userResponseSchema.parse(user);
    }),

  /**
   * Update current user profile
   */
  updateProfile: protectedProcedure
    .input(userUpdateProfileSchema) // <-- Use correct schema
    .mutation(async ({ ctx, input }) => {
      // --- FIX 6: Handle schema discrepancy ---
      // Your validation schema has 'bio', but your DB table doesn't.
      // We'll update only the fields that exist in both.
      const { name } = input;
      // When you add 'bio' to the 'users' table, you can add it here.

      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      return userResponseSchema.parse(updatedUser);
    }),

  /**
   * List all users (public, limited info)
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userList = await ctx.db.query.users.findMany({
        columns: {
          id: true,
          name: true,
          avatarUrl: true, // Not 'image'
          createdAt: true,
        },
        limit: input.limit,
        offset: input.offset,
      });

      // Use the list response schema for security
      return userListResponseSchema.parse(userList);
    }),
});
