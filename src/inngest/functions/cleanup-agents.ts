import { inngest } from "../client";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { sql } from "drizzle-orm";

export const cleanupSoftDeletedAgents = inngest.createFunction(
  { 
    id: "cleanup-soft-deleted-agents", 
    name: "Cleanup Soft Deleted Agents",
    // Inngest v3 syntax requires triggers (event or cron) to be inside the first argument
    triggers: [{ cron: "0 0 * * *" }] 
  },
  async ({ step }) => {
    await step.run("delete-expired-agents", async () => {
      // Hard delete agents where deletedAt is older than 15 days
      const result = await db.delete(agents)
        .where(sql`${agents.deletedAt} <= NOW() - INTERVAL '15 days'`)
        .returning({ id: agents.id });
      
      return {
        deletedCount: result.length,
        deletedIds: result.map((r) => r.id),
      };
    });
  }
);
