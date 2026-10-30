import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { initTRPC, TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { cache } from 'react';
export const createTRPCContext = cache(async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return { userId: 'user_123' };
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async({ctx, next})=>{
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session){
   throw new TRPCError({code:"UNAUTHORIZED", message: "Unauthorized!!"}) 
  }
  return next({ctx: {...ctx, auth:session} })
});

export const teacherProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, ctx.auth.user.id),
  });
  const userRole = dbUser?.role || (ctx.auth.user as any)?.role || 'student';
  if (userRole !== 'teacher' && userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Teacher or Admin role required.' });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, ctx.auth.user.id),
  });
  const userRole = dbUser?.role || (ctx.auth.user as any)?.role || 'student';
  if (userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin role required.' });
  }
  return next({ ctx });
});