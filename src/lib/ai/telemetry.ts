import "server-only";
import { db } from "@/db";
import { aiTraces, adminNotifications } from "@/db/schema";
import { Langfuse } from "langfuse";
import { aiEnv, hasLangfuse } from "./env";

export interface Span {
  name: string;
  startMs: number;
  endMs?: number;
  meta?: Record<string, unknown>;
}

export interface TraceRecord {
  traceId: string;
  userId?: string | null;
  feature: string;
  model: string;
  provider?: string;
  tier?: string;
  promptSnippet: string;
  responseSnippet?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  costUsd?: number;
  cacheHit?: "exact" | "semantic" | null;
  fallbackUsed?: boolean;
  guardrailPassed?: boolean;
  flaggedReason?: string | null;
  status: "success" | "flagged" | "error" | "review";
  errorType?: string | null;
  spans?: Span[];
  metadata?: Record<string, unknown>;
}

const langfuse = hasLangfuse
  ? new Langfuse({
      publicKey: aiEnv.LANGFUSE_PUBLIC_KEY!,
      secretKey: aiEnv.LANGFUSE_SECRET_KEY!,
      baseUrl: aiEnv.LANGFUSE_HOST,
      flushAt: 10,
    })
  : null;

/** Tiny span helper: `const s = tracer.start("guardrails"); ...; s.end({ ok: true })` */
export function createTracer() {
  const spans: Span[] = [];
  return {
    spans,
    start(name: string) {
      const span: Span = { name, startMs: Date.now() };
      spans.push(span);
      return {
        end(meta?: Record<string, unknown>) {
          span.endMs = Date.now();
          span.meta = meta;
        },
      };
    },
  };
}

const LATENCY_ALERT_MS = 5000;
const COST_ALERT_USD = 0.05;

const GREEK_GOD_MODEL_ALIASES: Record<string, string> = {
  "llama-3.3-70b-versatile": "Athena-EdC-v1",
  "llama-3.1-8b-instant": "Hermes-EdC-v1",
  "openai/gpt-oss-120b": "Apollo-EdC-v1",
  "gpt-4o": "Apollo-EdC-v1",
  "gpt-4o-mini": "Prometheus-EdC-v1",
  "gemini-2.5-pro": "Zelos-EdC-v1",
  "gemini-2.5-flash": "Iris-EdC-v1",
  "gemini-2.5-flash-lite": "Iris-EdC-v1",
  "gemini-embedding-001": "Mnemosyne-EdC-v1",
  "BAAI/bge-reranker-v2-m3": "Mnemosyne-EdC-v1",
  "qwen2.5:7b": "Metis-EdC-v1",
};

export function toPublicModelName(rawModel: string): string {
  if (!rawModel) return "Athena-EdC-v1";
  if (rawModel.endsWith("-EdC-v1")) return rawModel;
  return GREEK_GOD_MODEL_ALIASES[rawModel] || "Athena-EdC-v1";
}

export function toPublicProviderName(rawProvider?: string): string {
  if (!rawProvider) return "Olympus-EdC-v1";
  if (rawProvider.endsWith("-EdC-v1")) return rawProvider;
  return "Olympus-EdC-v1";
}

/** Persist trace to Postgres (+ Langfuse if configured) and raise admin alerts. Never throws. */
export async function recordTrace(t: TraceRecord) {
  const publicModel = toPublicModelName(t.model);
  const publicProvider = toPublicProviderName(t.provider);
  try {
    await db.insert(aiTraces).values({
      traceId: t.traceId,
      userId: t.userId ?? null,
      feature: t.feature,
      model: publicModel,
      provider: publicProvider,
      tier: t.tier,
      promptSnippet: t.promptSnippet.slice(0, 500),
      responseSnippet: (t.responseSnippet ?? "").slice(0, 500),
      promptTokens: t.promptTokens ?? 0,
      completionTokens: t.completionTokens ?? 0,
      totalTokens: (t.promptTokens ?? 0) + (t.completionTokens ?? 0),
      latencyMs: t.latencyMs,
      costUsd: t.costUsd ?? 0,
      cacheHit: t.cacheHit ?? null,
      fallbackUsed: t.fallbackUsed ?? false,
      guardrailPassed: t.guardrailPassed ?? true,
      flaggedReason: t.flaggedReason ?? null,
      status: t.status,
      errorType: t.errorType ?? null,
    });

    const alerts: (typeof adminNotifications.$inferInsert)[] = [];
    if (t.status === "flagged") {
      alerts.push({
        type: "guardrail_alert",
        title: `🚨 Guardrail violation in ${t.feature}`,
        message: `${t.flaggedReason ?? "Unsafe content"} — "${t.promptSnippet.slice(0, 100)}…" (trace ${t.traceId})`,
        severity: "critical",
      });
    } else if (t.status === "error") {
      alerts.push({
        type: "ai_error",
        title: `❌ AI failure in ${t.feature}`,
        message: `${t.errorType ?? "error"} (trace ${t.traceId})`,
        severity: "critical",
      });
    } else if (t.latencyMs > LATENCY_ALERT_MS && !t.cacheHit) {
      alerts.push({
        type: "latency_spike",
        title: `⚠️ Latency spike (${t.latencyMs}ms)`,
        message: `${publicProvider}/${publicModel} in ${t.feature} (trace ${t.traceId})`,
        severity: "warning",
      });
    }
    if ((t.costUsd ?? 0) > COST_ALERT_USD) {
      alerts.push({
        type: "cost_spike",
        title: `💸 Expensive request ($${t.costUsd!.toFixed(4)})`,
        message: `${publicModel} in ${t.feature} (trace ${t.traceId})`,
        severity: "warning",
      });
    }
    if (alerts.length) await db.insert(adminNotifications).values(alerts);
  } catch (err) {
    console.error("[ai-telemetry] failed to record trace:", (err as Error)?.message);
  }

  if (langfuse) {
    try {
      const trace = langfuse.trace({
        id: t.traceId,
        name: t.feature,
        userId: t.userId ?? undefined,
        metadata: { ...t.metadata, cacheHit: t.cacheHit, tier: t.tier, status: t.status },
        tags: [t.feature, t.status, publicProvider],
      });
      for (const s of t.spans ?? []) {
        trace.span({ name: s.name, startTime: new Date(s.startMs), endTime: s.endMs ? new Date(s.endMs) : undefined, metadata: s.meta });
      }
      trace.generation({
        name: "llm",
        model: publicModel,
        input: t.promptSnippet,
        output: t.responseSnippet,
        usage: { input: t.promptTokens, output: t.completionTokens, totalCost: t.costUsd },
        level: t.status === "error" ? "ERROR" : t.status === "flagged" ? "WARNING" : "DEFAULT",
      });
      await langfuse.flushAsync();
    } catch {
      /* optional */
    }
  }
}
