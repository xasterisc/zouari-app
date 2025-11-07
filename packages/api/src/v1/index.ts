import { router } from '../trpc.js';
import { userRouter } from './routers/user.router.js';

/**
 * API v1 router
 * All v1 routes are namespaced under /v1
 */
export const v1Router = router({
  user: userRouter,
  // Add more routers here as you build features
});
