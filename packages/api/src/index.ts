import { router } from './trpc.js';
import { v1Router } from './v1/index.js';
/** * Main application router * Combines all versioned routers */
export const appRouter = router({
  v1: v1Router,
});
export type AppRouter = typeof appRouter;
// Export context and types
export type { Context } from './context.js';
export { createContext } from './context.js';
