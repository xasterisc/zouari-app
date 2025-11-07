import { createAuthClient } from 'better-auth/client';

/**
 * Better Auth client for use in frontend applications
 * (e.g., in your Next.js app).
 *
 * @example
 * import { useSession, signIn } from '@zouari-app/auth/client';
 *
 * function MyComponent() {
 * const { data: session } = useSession();
 * // ...
 * }
 */
export const authClient = createAuthClient({
  // We use a relative path here.
  // This will be intercepted by the Next.js rewrites
  // (defined in 'apps/web/next.config.mjs')
  // and proxied to your Fastify API server.
  baseURL: '/api/auth',
});

// Export commonly used methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  updateUser,
  changePassword,
  changeEmail,
  resetPassword,
  forgetPassword,
  verifyEmail,
} = authClient;
