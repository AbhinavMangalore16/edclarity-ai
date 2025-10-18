import { db } from "@/db";
import { agents } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { agenticSchema } from "../schemas";
import { eq } from "drizzle-orm";
import {z} from "zod";
// import { TRPCError } from "@trpc/server";

export const agenticRouter = createTRPCRouter({
    getOne: protectedProcedure.input(z.object({id: z.string()})).query(async({input})=>{
        const [getAgent] = await db.select().from(agents).where(eq(agents.id, input.id));
        return getAgent;
    }),
    getMany: protectedProcedure.query(async () => {
        const data = await db.select().from(agents);

        return data.map((row) => {
            let parsedMetadata = {};
            try {
                parsedMetadata = row.metadata ? JSON.parse(row.metadata) : {};
            } catch (e) {
                console.error("Failed to parse metadata for agent:", row.id, e);
            }

            return {
                ...row,
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