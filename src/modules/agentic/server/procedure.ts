import { db } from "@/db";
import { agents } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { agenticMetadataSchema, agenticSchema } from "../schemas";
import { eq, getTableColumns, sql } from "drizzle-orm";
import { z } from "zod";
// import { TRPCError } from "@trpc/server";

export const agenticRouter = createTRPCRouter({
    getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
        const [getAgent] = await db.select({ ...getTableColumns(agents) }).from(agents).where(eq(agents.id, input.id));
        return getAgent;
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
                })
            )
        )
        .query(async ({ ctx }) => {
            const data = await db
                .select()
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