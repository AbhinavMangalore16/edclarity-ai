import { db } from "@/db";
import { agents } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { agenticMetadataSchema, agenticSchema } from "../schemas";
import { and, eq, getTableColumns, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
        const [row] = await db.select({ ...getTableColumns(agents), meetingCount: sql<number>`5` })
            .from(agents)
            .where(and(eq(agents.id, input.id), eq(agents.userId, ctx.auth.user.id)));
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
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
        .output(
            z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    instructions: z.string(),
                    createdAt: z.string(),
                    updatedAt: z.string(),
                    userId: z.string(),
                    metadata: agenticMetadataSchema, // ✅ strong typing
                    meetingCount: z.number(),
                })
            )
        )
            .query(async ({ ctx }) => {
                const data = await db
                    .select({ ...getTableColumns(agents), meetingCount: sql<number>`7` })
                    .from(agents)
                    .where(eq(agents.userId, ctx.auth.user.id));

                return data.map((row) => {
                    let parsedMetadata = {};
                    try {
                        parsedMetadata =
                            row.metadata && typeof row.metadata === "string"
                                ? JSON.parse(row.metadata)
                                : {};
                    } catch (e) {
                        console.error("Invalid metadata JSON for agent:", row.id);
                    }

                    return {
                        id: row.id,
                        name: row.name,
                        instructions: row.instructions,
                        createdAt: row.createdAt.toISOString(), // ✅ convert Date → string
                        updatedAt: row.updatedAt.toISOString(), // ✅ fix type
                        userId: row.userId,
                        metadata: parsedMetadata,
                        meetingCount: row.meetingCount,
                    };
                });
            }),
            create: protectedProcedure.input(agenticSchema)
                .mutation(async ({ input, ctx }) => {
                    const metaData = JSON.stringify(input.metadata);
                    const [addAgent] = await db.insert(agents).values({
                        ...input, metadata: metaData, userId: ctx.auth.user.id,
                    }).returning();
                    return addAgent;
                })
})