import { createTRPCRouter, adminProcedure } from "@/trpc/init";
import { db } from "@/db";
import { aiTraces, adminNotifications, aiReviewQueue, ragFeedback, user } from "@/db/schema";
import { eq, and, desc, count, ilike } from "drizzle-orm";
import { z } from "zod";

export const observabilityRouter = createTRPCRouter({
  getTraces: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        feature: z.string().optional(),
        status: z.enum(["all", "success", "flagged", "error", "review"]).optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const { search, feature, status, page, pageSize } = input;

      const data = await db
        .select({
          id: aiTraces.id,
          traceId: aiTraces.traceId,
          userId: aiTraces.userId,
          feature: aiTraces.feature,
          model: aiTraces.model,
          provider: aiTraces.provider,
          tier: aiTraces.tier,
          promptSnippet: aiTraces.promptSnippet,
          responseSnippet: aiTraces.responseSnippet,
          promptTokens: aiTraces.promptTokens,
          completionTokens: aiTraces.completionTokens,
          totalTokens: aiTraces.totalTokens,
          latencyMs: aiTraces.latencyMs,
          costUsd: aiTraces.costUsd,
          cacheHit: aiTraces.cacheHit,
          fallbackUsed: aiTraces.fallbackUsed,
          guardrailPassed: aiTraces.guardrailPassed,
          flaggedReason: aiTraces.flaggedReason,
          status: aiTraces.status,
          errorType: aiTraces.errorType,
          createdAt: aiTraces.createdAt,
          userEmail: user.email,
        })
        .from(aiTraces)
        .leftJoin(user, eq(aiTraces.userId, user.id))
        .where(
          and(
            search ? ilike(aiTraces.promptSnippet, `%${search}%`) : undefined,
            feature && feature !== "all" ? eq(aiTraces.feature, feature) : undefined,
            status && status !== "all" ? eq(aiTraces.status, status) : undefined
          )
        )
        .orderBy(desc(aiTraces.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [total] = await db
        .select({ count: count() })
        .from(aiTraces)
        .where(
          and(
            search ? ilike(aiTraces.promptSnippet, `%${search}%`) : undefined,
            feature && feature !== "all" ? eq(aiTraces.feature, feature) : undefined,
            status && status !== "all" ? eq(aiTraces.status, status) : undefined
          )
        );

      const totalCount = Math.ceil((total?.count || 0) / pageSize);
      return { data, total: total?.count || 0, totalCount };
    }),

  getObservabilityStats: adminProcedure.query(async () => {
    const traces = await db.select().from(aiTraces);

    const totalCalls = traces.length;
    let totalLatency = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;
    let passedCount = 0;
    let flaggedCount = 0;
    let errorCount = 0;
    let cacheHits = 0;
    let fallbacks = 0;
    const latencies: number[] = [];

    for (const t of traces) {
      const l = t.latencyMs || 0;
      totalLatency += l;
      latencies.push(l);
      totalTokens += t.totalTokens || 0;
      totalCostUsd += t.costUsd || 0;
      if (t.guardrailPassed) passedCount++;
      if (t.status === "flagged") flaggedCount++;
      if (t.status === "error") errorCount++;
      if (t.cacheHit) cacheHits++;
      if (t.fallbackUsed) fallbacks++;
    }

    latencies.sort((a, b) => a - b);
    const pct = (p: number) =>
      latencies.length > 0 ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] : 0;

    const avgLatency = totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0;
    const p50Latency = pct(0.5);
    const p95Latency = pct(0.95);
    const p99Latency = pct(0.99);
    const guardrailPassRate = totalCalls > 0 ? Math.round((passedCount / totalCalls) * 100) : 100;
    const cacheHitRate = totalCalls > 0 ? Math.round((cacheHits / totalCalls) * 100) : 0;
    const fallbackRate = totalCalls > 0 ? Math.round((fallbacks / totalCalls) * 100) : 0;
    const errorRate = totalCalls > 0 ? Math.round((errorCount / totalCalls) * 100) : 0;

    const [unreadAlerts, pendingReviews] = await Promise.all([
      db.select({ count: count() }).from(adminNotifications).where(eq(adminNotifications.isRead, false)),
      db.select({ count: count() }).from(aiReviewQueue).where(eq(aiReviewQueue.status, "pending")),
    ]);

    return {
      totalCalls,
      avgLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      guardrailPassRate,
      cacheHitRate,
      fallbackRate,
      errorRate,
      flaggedCount,
      unreadAlertsCount: unreadAlerts[0]?.count || 0,
      pendingReviewsCount: pendingReviews[0]?.count || 0,
    };
  }),

  getReviewQueue: adminProcedure
    .input(
      z.object({
        status: z.enum(["all", "pending", "approved", "edited", "rejected"]).default("pending"),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const status = input?.status ?? "pending";
      const limit = input?.limit ?? 50;
      return await db
        .select()
        .from(aiReviewQueue)
        .where(status === "all" ? undefined : eq(aiReviewQueue.status, status))
        .orderBy(desc(aiReviewQueue.createdAt))
        .limit(limit);
    }),

  decideReview: adminProcedure
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(["approved", "edited", "rejected"]),
        editedOutput: z.string().optional(),
        reviewerNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await db
        .update(aiReviewQueue)
        .set({
          status: input.decision,
          reviewerId: ctx.auth.user.id,
          editedOutput: input.editedOutput ?? null,
          reviewerNote: input.reviewerNote ?? null,
          reviewedAt: new Date(),
        })
        .where(eq(aiReviewQueue.id, input.id))
        .returning();

      // Feed human decision into LTR / eval training log
      if (item) {
        await db
          .insert(ragFeedback)
          .values({
            traceId: item.traceId,
            userId: ctx.auth.user.id,
            query: item.input.slice(0, 2000),
            docId: `hitl:${item.feature}`,
            rank: 0,
            event: input.decision === "rejected" ? "thumbs_down" : "thumbs_up",
            value: input.decision === "rejected" ? -1 : input.decision === "edited" ? 0.5 : 1,
            features: {
              source: "human_review",
              decision: input.decision,
              riskScore: item.riskScore,
              editedOutput: input.editedOutput,
            },
          })
          .catch(() => null);
      }

      return { success: true, item };
    }),

  getNotifications: adminProcedure.query(async () => {
    return await db
      .select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(50);
  }),

  markNotificationRead: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(adminNotifications)
        .set({ isRead: true })
        .where(eq(adminNotifications.id, input.id));
      return { success: true };
    }),
});

