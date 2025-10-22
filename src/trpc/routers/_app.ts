import { createTRPCRouter } from '../init';
import { agenticRouter } from '@/modules/agentic/server/procedure';
import { meetingRouter } from '@/modules/meetings/server/procedure';
export const appRouter = createTRPCRouter({
  agents: agenticRouter,
  meetings: meetingRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
