import "server-only";
import { createHash } from "crypto";
import { db } from "@/db";
import { outboxEvents, indexState } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { eq, isNull, asc, lte, and } from "drizzle-orm";
import { invalidateByDoc } from "./semantic-cache";

export type AggregateType = "document" | "lms_chapter" | "clarity_lesson" | "lms_attachment";
export type OutboxOp = "upsert" | "delete";

export interface OutboxPayload {
  title?: string;
  url?: string;
  content?: string;
  userId?: string;
  courseId?: string;
  metadata?: Record<string, unknown>;
}

const LIBRARAG_URL = process.env.LIBRARAG_URL || "http://localhost:8000";
const EMBEDDING_VERSION = process.env.EMBEDDING_VERSION || "all-MiniLM-L6-v2:v1";

export const hashContent = (raw: string) =>
  createHash("sha256").update(raw).digest("hex");

/**
 * Record an outbox event whenever a document, chapter, or lesson is created, updated, or deleted,
 * and nudge Inngest to dispatch immediately (with the 1-min cron acting as a safety net).
 */
export async function emitOutboxEvent(opts: {
  aggregateType: AggregateType;
  aggregateId: string;
  op: OutboxOp;
  payload?: OutboxPayload;
}) {
  const [row] = await db
    .insert(outboxEvents)
    .values({
      aggregateType: opts.aggregateType,
      aggregateId: opts.aggregateId,
      op: opts.op,
      payload: opts.payload ?? {},
    })
    .returning({ id: outboxEvents.id });

  // Best-effort immediate wakeup
  void inngest
    .send({
      name: "cdc/outbox.queued",
      data: { eventId: row.id, aggregateType: opts.aggregateType, aggregateId: opts.aggregateId, op: opts.op },
    })
    .catch(() => null);

  return row.id;
}

/**
 * Process a single outbox event idempotently against LibraRAG and update `index_state` + semantic cache.
 */
export async function processOutboxRow(row: typeof outboxEvents.$inferSelect): Promise<{ skipped?: boolean; status: string }> {
  const stateKey = `${row.aggregateType}:${row.aggregateId}`;
  const payload = (row.payload ?? {}) as OutboxPayload;

  if (row.op === "delete") {
    const res = await fetch(`${LIBRARAG_URL}/api/index/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_id: stateKey, aggregate_id: row.aggregateId }),
    }).catch(() => null);

    // Even if LibraRAG is offline during local dev, allow delete bookkeeping if 2xx or 404
    if (res && !res.ok && res.status !== 404) {
      throw new Error(`LibraRAG delete failed with HTTP ${res.status}`);
    }

    await db.delete(indexState).where(eq(indexState.id, stateKey));
    await invalidateByDoc(stateKey);
    await invalidateByDoc(row.aggregateId);
    return { status: "deleted" };
  }

  // upsert: compute content hash for idempotency
  const fingerprintSource = JSON.stringify({
    title: payload.title ?? "",
    url: payload.url ?? "",
    content: payload.content ?? "",
    version: EMBEDDING_VERSION,
  });
  const contentHash = hashContent(fingerprintSource);

  const [existing] = await db.select().from(indexState).where(eq(indexState.id, stateKey));
  if (existing && existing.contentHash === contentHash && existing.embeddingVersion === EMBEDDING_VERSION) {
    return { skipped: true, status: "unchanged" };
  }

  const res = await fetch(`${LIBRARAG_URL}/api/index/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      doc_id: stateKey,
      aggregate_type: row.aggregateType,
      aggregate_id: row.aggregateId,
      title: payload.title,
      url: payload.url,
      content: payload.content,
      user_id: payload.userId,
      metadata: payload.metadata ?? {},
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`LibraRAG upsert HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  await db
    .insert(indexState)
    .values({
      id: stateKey,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      contentHash,
      embeddingVersion: EMBEDDING_VERSION,
      userId: payload.userId ?? null,
      indexedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: indexState.id,
      set: {
        contentHash,
        embeddingVersion: EMBEDDING_VERSION,
        indexedAt: new Date(),
      },
    });

  await invalidateByDoc(stateKey);
  await invalidateByDoc(row.aggregateId);
  return { status: "indexed" };
}

/**
 * Drain up to `batchSize` pending outbox events (attempts < 5).
 */
export async function drainOutboxBatch(batchSize = 25) {
  const pending = await db
    .select()
    .from(outboxEvents)
    .where(and(isNull(outboxEvents.processedAt), lte(outboxEvents.attempts, 5)))
    .orderBy(asc(outboxEvents.createdAt))
    .limit(batchSize);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const res = await processOutboxRow(row);
      if (res.skipped) skipped++;
      else processed++;

      await db
        .update(outboxEvents)
        .set({ processedAt: new Date(), lastError: null })
        .where(eq(outboxEvents.id, row.id));
    } catch (err) {
      failed++;
      await db
        .update(outboxEvents)
        .set({
          attempts: row.attempts + 1,
          lastError: (err as Error)?.message?.slice(0, 500) ?? "unknown error",
        })
        .where(eq(outboxEvents.id, row.id));
    }
  }

  return { total: pending.length, processed, skipped, failed };
}

