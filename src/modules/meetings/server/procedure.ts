import { db } from "@/db";
import { meetings } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
// import { agenticMetadataSchema, agenticSchema, agenticUpdationSchema } from "../schemas";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { DEFAULT_PAGE, DEFAULT_PAGESIZE, MAX_PAGESIZE, MIN_PAGESIZE } from "@/constants";
// import { TRPCError } from "@trpc/server";

export const meetingRouter = createTRPCRouter({
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
        }))
        .query(async ({ input, ctx }) => {
            const { page, pageSize, search } = input;
            const data = await db.select({ ...getTableColumns(meetings) })
                .from(meetings)
                .where(
                    and(
                        eq(meetings.userId, ctx.auth.user.id),
                        search ? ilike(meetings.name, `%${search}%`) : undefined
                    )
                )
                .orderBy(desc(meetings.createdAt))
                .limit(pageSize)
                .offset((page - 1) * pageSize);

            const [total] = await db.select({ count: count() })
                .from(meetings)
                .where(
                    and(
                        eq(meetings.userId, ctx.auth.user.id),
                        search ? ilike(meetings.name, `%${search}%`) : undefined
                    )
                )
            const totalCount = Math.ceil(total.count/pageSize);
            return { data, total: total.count, totalCount };
        })
})