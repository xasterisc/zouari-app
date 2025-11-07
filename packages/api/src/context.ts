import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { Session, User } from '@zouari-app/auth';
import { authPromise } from '@zouari-app/auth';
import { type Database, dbPromise } from '@zouari-app/db';

/**
 * Define the shape of our context.
 * This includes the resolved db, session, and user.
 */
export interface AppContext {
  db: Database;
  session: Session | null;
  user: User | undefined | null;
  req: CreateFastifyContextOptions['req'];
  res: CreateFastifyContextOptions['res'];
}

/**
 * Create tRPC context with Better Auth session
 * This function is called on *every* request.
 */
export async function createContext({
  req,
  res,
}: CreateFastifyContextOptions): Promise<AppContext> {
  // 1. Await the resolved clients.
  const auth = await authPromise;
  const db = await dbPromise;

  // 2. Get session from Better Auth
  // auth.api.getSession returns an object: { session, user }
  const authResponse = await auth.api.getSession(req.raw);

  // 3. Return the complete context
  return {
    db, // The resolved database client
    session: authResponse?.session ?? null, // Converts undefined to null
    user: authResponse?.user ?? null,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
