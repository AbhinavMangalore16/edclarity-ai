import "server-only";
import { db } from "@/db";
import { aiReviewQueue, adminNotifications } from "@/db/schema";

/** Features whose outputs are high-stakes and always need a human sign-off before being final. */
export const ALWAYS_REVIEW_FEATURES = new Set<string>(["grading", "certificate"]);

export interface ReviewSignal {
  guardrailIssues: string[];
  groundedness?: number;
  inputSeverity?: string;
  userThumbsDown?: boolean;
}

/** 0..1 risk score combining all signals; ≥ 0.5 enqueues a review. */
export function riskScore(feature: string, s: ReviewSignal) {
  let r = 0;
  if (ALWAYS_REVIEW_FEATURES.has(feature)) r = 1;
  if (s.guardrailIssues.some((i) => i.startsWith("pii_leak"))) r += 0.5;
  if (s.guardrailIssues.includes("system_prompt_leak")) r += 0.8;
  if (s.guardrailIssues.includes("low_groundedness")) r += 0.4;
  if (s.groundedness !== undefined && s.groundedness < 0.2) r += 0.2;
  if (s.inputSeverity === "low") r += 0.1;
  if (s.userThumbsDown) r += 0.5;
  return Math.min(1, r);
}

export async function enqueueReview(item: {
  traceId: string;
  feature: string;
  userId?: string | null;
  input: string;
  output?: string;
  reason: string;
  riskScore: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    const [row] = await db
      .insert(aiReviewQueue)
      .values({
        traceId: item.traceId,
        feature: item.feature,
        userId: item.userId ?? null,
        input: item.input.slice(0, 8000),
        output: item.output?.slice(0, 16000),
        reason: item.reason,
        riskScore: item.riskScore,
        metadata: item.metadata,
      })
      .returning({ id: aiReviewQueue.id });
    if (item.riskScore >= 0.8) {
      await db.insert(adminNotifications).values({
        type: "review_required",
        title: `🧑‍⚖️ High-risk AI output needs review (${item.feature})`,
        message: `${item.reason} — risk ${item.riskScore.toFixed(2)} (trace ${item.traceId})`,
        severity: "critical",
      });
    }
    return row?.id;
  } catch (err) {
    console.error("[hitl] enqueue failed", (err as Error)?.message);
  }
}
