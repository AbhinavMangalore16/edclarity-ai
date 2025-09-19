import { db } from "@/db";
import { agents } from "@/db/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const agenticRouter = createTRPCRouter({
    getMany: baseProcedure.query(async ({ ctx }) => {
        const data = await db.select().from(agents);
        await new Promise(resolve => setTimeout(resolve, 5000));
        await new Promise(resolve => setTimeout(resolve, 3000));
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "💥 Simulated catastrophic failure 💥",
            cause: new Error("Simulated DB connection lost → cascading failure → service unavailable"),
        });
        return data;
    })

})