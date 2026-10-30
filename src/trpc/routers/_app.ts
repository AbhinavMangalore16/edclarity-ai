import { createTRPCRouter } from '../init';
import { agenticRouter } from '@/modules/agentic/server/procedure';
import { meetingRouter } from '@/modules/meetings/server/procedure';
import { clarityRouter } from '@/modules/clarities/server/procedure';
import { lmsRouter } from '@/modules/lms/server/procedure';
import { personaRouter } from '@/modules/persona/server/procedure';
import { observabilityRouter } from '@/modules/observability/server/procedure';

export const appRouter = createTRPCRouter({
  agents: agenticRouter,
  meetings: meetingRouter,
  clarities: clarityRouter,
  lms: lmsRouter,
  persona: personaRouter,
  observability: observabilityRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
