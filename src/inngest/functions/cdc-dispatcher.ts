import { inngest } from "../client";
import { drainOutboxBatch, emitOutboxEvent } from "@/lib/ai/cdc";
import { db } from "@/db";
import { documents, indexState } from "@/db/schema";

const LIBRARAG_URL = process.env.LIBRARAG_URL || "http://localhost:8000";

/**
 * Runs every minute (or immediately on `cdc/outbox.queued`) to drain pending outbox mutations
 * into the LibraRAG vector + BM25 index and invalidate stale semantic cache entries.
 */
export const cdcDispatcher = inngest.createFunction(
  {
    id: "cdc-dispatcher",
    triggers: [{ cron: "*/5 * * * *" }, { event: "cdc/outbox.queued" }],
  },
  async ({ step }: any) => {
    return await step.run("drain-outbox-batch", async () => {
      return await drainOutboxBatch(25);
    });
  }
);

/**
 * Nightly reconciliation: compares Postgres `documents` against `index_state` and enqueues
 * missing documents or deletes orphan index entries.
 */
export const cdcReconcileNightly = inngest.createFunction(
  {
    id: "cdc-reconcile-nightly",
    triggers: [{ cron: "30 3 * * *" }],
  },
  async ({ step }: any) => {
    return await step.run("reconcile-postgres-vs-index", async () => {
      const [allDocs, indexed] = await Promise.all([
        db.select().from(documents),
        db.select().from(indexState),
      ]);

      const indexedDocIds = new Set(
        indexed.filter((i) => i.aggregateType === "document").map((i) => i.aggregateId)
      );
      const pgDocIds = new Set(allDocs.map((d) => d.id));

      let enqueuedUpserts = 0;
      let enqueuedDeletes = 0;

      for (const doc of allDocs) {
        if (!indexedDocIds.has(doc.id)) {
          await emitOutboxEvent({
            aggregateType: "document",
            aggregateId: doc.id,
            op: "upsert",
            payload: { title: doc.name, url: doc.url, userId: doc.userId, metadata: { key: doc.key } },
          });
          enqueuedUpserts++;
        }
      }

      for (const idx of indexed) {
        if (idx.aggregateType === "document" && !pgDocIds.has(idx.aggregateId)) {
          await emitOutboxEvent({
            aggregateType: "document",
            aggregateId: idx.aggregateId,
            op: "delete",
          });
          enqueuedDeletes++;
        }
      }

      return { totalDocs: allDocs.length, indexedCount: indexed.length, enqueuedUpserts, enqueuedDeletes };
    });
  }
);

/**
 * Weekly Learning-to-Rank (LambdaMART) model retraining job with NDCG@5 promotion gate.
 */
export const ltrWeeklyRetrain = inngest.createFunction(
  {
    id: "ltr-weekly-retrain",
    triggers: [{ cron: "0 4 * * 0" }, { event: "ltr/retrain.requested" }],
  },
  async ({ step }: any) => {
    return await step.run("trigger-librarag-ltr-retrain", async () => {
      try {
        const res = await fetch(`${LIBRARAG_URL}/api/ltr/train`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promote_if_improved: true }),
        });
        if (!res.ok) {
          return { ok: false, status: res.status, error: await res.text() };
        }
        return await res.json();
      } catch (err: any) {
        return { ok: false, error: err?.message ?? "LibraRAG unreachable" };
      }
    });
  }
);

