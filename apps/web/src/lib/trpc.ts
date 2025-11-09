import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@zouari-app/api';

export const trpc = createTRPCReact<AppRouter>();
