import { db } from "@/db";
import { aiTraces, adminNotifications } from "@/db/schema";
import { toPublicModelName } from "@/lib/ai/telemetry";

export interface RecordTraceOptions {
  userId?: string | null;
  feature: "clarities" | "persona_qna" | "meeting_transcription" | "ai_notetaker" | "agent_chat";
  model: string;
  promptSnippet: string;
  responseSnippet?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  guardrailPassed?: boolean;
  flaggedReason?: string | null;
  status?: "success" | "flagged" | "error";
}

/**
 * Industry-Standard AI Telemetry & Observability Logger.
 * Records LLM trace metrics (latency, token count, guardrail flags) into `ai_traces`
 * and automatically dispatches alert notifications for admin review on anomalies.
 */
export async function recordAiTrace(options: RecordTraceOptions) {
  try {
    const isGuardrailFailed = options.guardrailPassed === false || options.status === "flagged";
    const status = isGuardrailFailed ? "flagged" : options.status || "success";
    const publicModel = toPublicModelName(options.model);

    const [trace] = await db
      .insert(aiTraces)
      .values({
        userId: options.userId || null,
        feature: options.feature,
        model: publicModel,
        promptSnippet: options.promptSnippet.slice(0, 500),
        responseSnippet: (options.responseSnippet || "").slice(0, 500),
        promptTokens: options.promptTokens || 0,
        completionTokens: options.completionTokens || 0,
        totalTokens: options.totalTokens || (options.promptTokens || 0) + (options.completionTokens || 0),
        latencyMs: options.latencyMs,
        guardrailPassed: !isGuardrailFailed,
        flaggedReason: options.flaggedReason || null,
        status,
      })
      .returning();

    // Trigger Automated Admin Notification Alert if guardrail flagged or high latency spike
    if (isGuardrailFailed) {
      await db.insert(adminNotifications).values({
        type: "guardrail_alert",
        title: `🚨 Guardrail Violation in ${options.feature}`,
        message: `A prompt was flagged by linguistic safety guardrails: "${options.flaggedReason || "Harmful content attempt"}". Prompt: "${options.promptSnippet.slice(0, 100)}..."`,
        severity: "critical",
        isRead: false,
      });
    } else if (options.latencyMs > 3000) {
      await db.insert(adminNotifications).values({
        type: "latency_spike",
        title: `⚠️ LLM Latency Spike Warning (${options.latencyMs}ms)`,
        message: `High response latency detected for model ${publicModel} in feature #${options.feature}.`,
        severity: "warning",
        isRead: false,
      });
    }

    return trace;
  } catch (err: any) {
    console.error("[AI TELEMETRY ERROR]: Failed to record trace:", err?.message || err);
  }
}
