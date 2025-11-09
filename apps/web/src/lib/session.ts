import { getSession } from '@zouari-app/auth/client';
import type { UserResponse } from '@zouari-app/validation';
import { cache } from 'react';

/**
 * Enterprise-grade, server-side utility to get the current user.
 *
 * This function is built for Server Components.
 * It uses React's `cache` to prevent multiple requests.
 *
 * How it works (Zero Trust S2S):
 * 1. `getSession()` is called (e.g., in a layout or page).
 * 2. Under the hood, it reads the request cookies (from `next/headers`).
 * 3. It makes a `fetch` request to `/api/auth/session` (with the cookie).
 * 4. The `next.config.mjs` rewrite  proxies this to your Fastify API.
 * 5. The API server (which has the secret) validates the cookie.
 * 6. The API server returns the user, or null.
 */
export const getCurrentUser = cache(async () => {
  try {
    const sessionResult = await getSession();

    // Check if the session data or its 'data' wrapper exists.
    if (!sessionResult?.data) {
      return null;
    }

    // If it does, we can safely access the user.
    const user = sessionResult.data.user;

    // Check if the user itself exists.
    if (!user) {
      return null;
    }
    return user as unknown as UserResponse;
  } catch (err) {
    console.error('[lib/session] Failed to get current user:', err);
    return null;
  }
});
