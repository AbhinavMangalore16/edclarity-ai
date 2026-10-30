import { db } from "@/db";
import { agents } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { agenticMetadataSchema, agenticSchema, agenticUpdationSchema } from "../schemas";
import { and, count, desc, eq, getTableColumns, ilike, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { DEFAULT_PAGE, DEFAULT_PAGESIZE, MAX_PAGESIZE, MIN_PAGESIZE } from "@/constants";
// import { TRPCError } from "@trpc/server";

export const agenticRouter = createTRPCRouter({
    getOne: protectedProcedure.input(z.object({ id: z.string() })).output(z.object({
        id: z.string(),
        name: z.string(),
        instructions: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        userId: z.string(),
        metadata: agenticMetadataSchema,
        meetingCount: z.number(),
    })).query(async ({ input, ctx }) => {
        const [row] = await db.select({ 
            ...getTableColumns(agents), 
            meetingCount: sql<number>`(SELECT count(*)::int FROM meetings WHERE agent_id = ${agents.id} AND status != 'cancelled' AND created_at >= NOW() - INTERVAL '14 days')` 
        })
            .from(agents)
            .where(
                and(
                    eq(agents.id, input.id), 
                    eq(agents.userId, ctx.auth.user.id),
                    isNull(agents.deletedAt)
                )
            );
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Agent NOT FOUND" });
        let parsed: unknown = {};
        try {
            parsed =
                typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
        } catch {
            parsed = {};
        }
        const metadata = agenticMetadataSchema.safeParse(parsed).success ?
            agenticMetadataSchema.parse(parsed) : agenticMetadataSchema.parse({});
        return {
            id: row.id,
            name: row.name,
            instructions: row.instructions,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            userId: row.userId,
            metadata,
            meetingCount: row.meetingCount,
        }

    }),
    getMany: protectedProcedure
        .input(
            z.object({
                page: z.number().default(DEFAULT_PAGE),
                pageSize: z.number().min(MIN_PAGESIZE).max(MAX_PAGESIZE).default(DEFAULT_PAGESIZE),
                search: z.string().nullish(),
            })
        )
        .output(
            z.object({
                data: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        instructions: z.string(),
                        createdAt: z.string(),
                        updatedAt: z.string(),
                        userId: z.string(),
                        metadata: agenticMetadataSchema,
                        meetingCount: z.number(),
                    })
                ),
                total: z.number(),
                totalPages: z.number(),
                remainingAgents: z.number(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { search, page, pageSize } = input;

            const rows = await db
                .select({ 
                    ...getTableColumns(agents), 
                    meetingCount: sql<number>`(SELECT count(*)::int FROM meetings WHERE agent_id = ${agents.id} AND status != 'cancelled' AND created_at >= NOW() - INTERVAL '14 days')` 
                })
                .from(agents)
                .where(
                    and(
                        isNull(agents.deletedAt),
                        search ? ilike(agents.name, `%${search}%`) : undefined
                    )
                )
                .orderBy(desc(agents.createdAt), desc(agents.id))
                .limit(pageSize)
                .offset((page - 1) * pageSize);

            const [total] = await db
                .select({ count: count() })
                .from(agents)
                .where(
                    and(
                        isNull(agents.deletedAt),
                        search ? ilike(agents.name, `%${search}%`) : undefined
                    )
                );

            const [userAgentCount] = await db.select({ count: count() })
                .from(agents)
                .where(
                    and(
                        eq(agents.userId, ctx.auth.user.id),
                        isNull(agents.deletedAt),
                        sql`${agents.createdAt} >= NOW() - INTERVAL '14 days'`
                    )
                );

            return {
                data: rows.map((row) => {
                    let parsedMetadata = {};
                    try {
                        parsedMetadata =
                            row.metadata && typeof row.metadata === "string"
                                ? JSON.parse(row.metadata)
                                : {};
                    } catch {
                        parsedMetadata = {};
                    }

                    return {
                        id: row.id,
                        name: row.name,
                        instructions: row.instructions,
                        createdAt: row.createdAt.toISOString(),
                        updatedAt: row.updatedAt.toISOString(),
                        userId: row.userId,
                        metadata: parsedMetadata,
                        meetingCount: row.meetingCount,
                    };
                }),
                total: total.count,
                totalPages: Math.ceil(total.count / pageSize),
                remainingAgents: Math.max(0, 5 - userAgentCount.count),
            };
        }),
    create: protectedProcedure.input(agenticSchema)
        .mutation(async ({ input, ctx }) => {
            // Free Tier Rate Limiting Check
            const [agentCount] = await db.select({ count: count() })
                .from(agents)
                .where(
                    and(
                        eq(agents.userId, ctx.auth.user.id),
                        isNull(agents.deletedAt),
                        sql`${agents.createdAt} >= NOW() - INTERVAL '14 days'`
                    )
                );

            if (agentCount.count >= 5) {
                throw new TRPCError({ code: "FORBIDDEN", message: "LIMIT_AGENTS" });
            }

            const metaData = JSON.stringify(input.metadata);
            const [addAgent] = await db.insert(agents).values({
                ...input, metadata: metaData, userId: ctx.auth.user.id,
            }).returning();
            return addAgent;
        }),
    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [removeAgent] = await db
                .update(agents)
                .set({ deletedAt: new Date() })
                .where(
                    and(
                        eq(agents.id, input.id),
                        eq(agents.userId, ctx.auth.user.id),
                        isNull(agents.deletedAt)
                    )
                ).returning();
            if (!removeAgent) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Agent NOT FOUND" })
            }
            return removeAgent;
        }),
    update: protectedProcedure
        .input(agenticUpdationSchema)
        .mutation(async ({ ctx, input }) => {
            const [updateAgent] = await db
                .update(agents)
                .set({
                    ...input,
                    metadata: JSON.stringify(input.metadata),
                })
                .where(
                    and(
                        eq(agents.id, input.id),
                        eq(agents.userId, ctx.auth.user.id)
                    )
                ).returning();
                            if (!updateAgent) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Agent NOT FOUND" })
            }
            return updateAgent;
        })
})