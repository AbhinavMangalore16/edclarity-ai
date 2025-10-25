import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
// import { agenticMetadataSchema, agenticSchema, agenticUpdationSchema } from "../schemas";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { DEFAULT_PAGE, DEFAULT_PAGESIZE, MAX_PAGESIZE, MIN_PAGESIZE } from "@/constants";
import { meetingSchema, meetingUpdationSchema } from "../schemas";
import { MeetingStatus } from "../types";
// import { TRPCError } from "@trpc/server";

export const meetingRouter = createTRPCRouter({
    create: protectedProcedure
        .input(meetingSchema)
        .mutation(async ({ input, ctx }) => {
            const [createdMeeting] = await db.insert(meetings)
                .values({
                    ...input,
                    userId: ctx.auth.user.id,
                }).returning();
            return createdMeeting;
        })
    ,
    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const [selectMeeting] = await db.select({ ...getTableColumns(meetings) })
                .from(meetings)
                .where(
                    and(
                        eq(meetings.id, input.id),
                        eq(meetings.userId, ctx.auth.user.id)
                    )
                )
            if (!selectMeeting) { throw new TRPCError({ code: "NOT_FOUND", message: "Meeting NOT FOUND" }); }
            return selectMeeting;
        }),
    getMany: protectedProcedure
        .input(z.object({
            page: z.number().default(DEFAULT_PAGE),
            pageSize: z.number().min(MIN_PAGESIZE).max(MAX_PAGESIZE).default(DEFAULT_PAGESIZE),
            search: z.string().nullish(),
            agentId: z.string().nullish(),
            status: z.enum([MeetingStatus.Upcoming, MeetingStatus.Active, MeetingStatus.Processing, MeetingStatus.Completed, MeetingStatus.Cancelled]).nullish(),
        }))
        .query(async ({ input, ctx }) => {
            const { page, pageSize, search, status, agentId } = input;
            const durationExpr = sql<number>`
                CASE 
                    WHEN ${meetings.endAt} IS NOT NULL AND ${meetings.startAt} IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (${meetings.endAt} - ${meetings.startAt})) 
                    ELSE NULL 
                END
                `.as("duration");
            const data = await db.select({ ...getTableColumns(meetings), agent: agents, duration: durationExpr })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))
                .where(
                    and(
                        eq(meetings.userId, ctx.auth.user.id),
                        search ? ilike(meetings.name, `%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId) : undefined,
                    )
                )
                .orderBy(desc(meetings.createdAt), desc(meetings.id))
                .limit(pageSize)
                .offset((page - 1) * pageSize);

            const [total] = await db.select({ count: count() })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))
                .where(
                    and(
                        eq(meetings.userId, ctx.auth.user.id),
                        search ? ilike(meetings.name, `%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId) : undefined,
                    )
                )
            console.log("TOTAL COUNT:", total.count);
            const totalCount = Math.ceil(total.count / pageSize);
            return { data, total: total.count, totalCount };
        })
    ,
    update: protectedProcedure
        .input(meetingUpdationSchema).mutation(
            async ({ input, ctx }) => {
                const [updateMeeting] = await db.update(meetings)
                    .set(input)
                    .where(
                        and(
                            eq(meetings.id, input.id),
                            eq(meetings.userId, ctx.auth.user.id),

                        )
                    )
                    .returning();
                if (!updateMeeting) { throw new TRPCError({ code: "NOT_FOUND", message: "Meeting NOT FOUND" }); }
            }
        )
})