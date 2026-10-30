import { inngest } from "../client";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emitOutboxEvent, processOutboxRow } from "@/lib/ai/cdc";
import { outboxEvents } from "@/db/schema";

/**
 * Event-driven PDF/document ingestion worker.
 * Triggered by `document/uploaded` or `pdf/process.requested`, writes & dispatches an outbox upsert.
 */
export const processPdf = inngest.createFunction(
  {
    id: "process-pdf",
    retries: 3,
    triggers: [{ event: "document/uploaded" }, { event: "pdf/process.requested" }],
  },
  async ({ event, step }: any) => {
    const { documentId, userId, url, title, content } = event.data ?? {};
    if (!documentId) {
      return { skipped: true, reason: "Missing documentId" };
    }

    const doc = await step.run("load-document-record", async () => {
      const [row] = await db.select().from(documents).where(eq(documents.id, documentId));
      return row ?? null;
    });

    const outboxId = await step.run("enqueue-outbox-event", async () => {
      return await emitOutboxEvent({
        aggregateType: "document",
        aggregateId: documentId,
        op: "upsert",
        payload: {
          title: title ?? doc?.name ?? documentId,
          url: url ?? doc?.url,
          content: content ?? undefined,
          userId: userId ?? doc?.userId,
          metadata: { key: doc?.key },
        },
      });
    });

    const result = await step.run("index-document-in-librarag", async () => {
      const [row] = await db.select().from(outboxEvents).where(eq(outboxEvents.id, outboxId));
      if (!row) return { status: "missing_outbox_row" };
      const res = await processOutboxRow(row);
      await db
        .update(outboxEvents)
        .set({ processedAt: new Date(), lastError: null })
        .where(eq(outboxEvents.id, outboxId));
      return res;
    });

    return { documentId, outboxId, ...result };
  }
);
