import { createTRPCRouter } from '../init';
import { agenticRouter } from '@/modules/agentic/server/procedure';
export const appRouter = createTRPCRouter({
  agents: agenticRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;