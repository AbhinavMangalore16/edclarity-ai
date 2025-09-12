import { db } from "@/db";
import { agents } from "@/db/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const agenticRouter = createTRPCRouter({
    getMany: baseProcedure.query(async({ctx})=>{
        const data = await db.select().from(agents);
        await new Promise(resolve=>setTimeout(resolve, 5000));
        throw new TRPCError({code: "BAD_REQUEST", message: "Simulated error for testing purposes"});
        return data;
    })

})