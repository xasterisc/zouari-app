import { authClient } from '@zouari-app/auth/client';

// Re-export the client-side auth functions
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  updateUser,
  changePassword,
  changeEmail,
} = authClient;

// Re-export types for convenience
export type { Session, User } from '@zouari-app/auth';
