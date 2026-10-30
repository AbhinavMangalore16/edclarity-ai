import "server-only";
import { nanoid } from "nanoid";
import { complete, completeStream, type ChatMessage, type Tier } from "./providers";
import { checkInput, checkOutput } from "./guardrails";
import { routeRequest, type Feature } from "./router";
import { cacheLookup, cacheStore, hashContext } from "./semantic-cache";
import { recordTrace, createTracer } from "./telemetry";
import { enqueueReview, riskScore } from "./hitl";
import { chargeTokens, type GatewayContext } from "./gateway";
import { AIError } from "./errors";

export interface RunAIOptions {
  feature: Feature;
  messages: ChatMessage[];
  gateway?: GatewayContext;
  tier?: Tier;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Retrieval context to check groundedness against. */
  context?: string;
  docIds?: string[];
  /** Cache config: false disables. `private` scopes the cache to this user. */
  cache?: false | { private?: boolean; ttlSec?: number };
  /** Block when the safety classifier is down (default: false = fail-open). */
  failClosed?: boolean;
  /** Skip the LLM input classifier (heuristics + PII still run). Use for trusted/system inputs. */
  trustedInput?: boolean;
}

export interface RunAIResult {
  traceId: string;
  text: string;
  model: string;
  provider: string;
  tier: Tier;
  cached: "exact" | "semantic" | null;
  fallbackUsed: boolean;
  costUsd: number;
  latencyMs: number;
  review?: { queued: boolean; reason: string };
  groundedness?: number;
}

const lastUser = (m: ChatMessage[]) => [...m].reverse().find((x) => x.role === "user")?.content ?? "";
const systemOf = (m: ChatMessage[]) => m.filter((x) => x.role === "system").map((x) => x.content).join("\n");

/** Replace the last user message with its sanitised (PII-redacted) version. */
function withSanitised(messages: ChatMessage[], sanitized: string): ChatMessage[] {
  const idx = messages.map((m) => m.role).lastIndexOf("user");
  if (idx < 0) return messages;
  const copy = messages.slice();
  copy[idx] = { ...copy[idx], content: sanitized };
  return copy;
}

/**
 * The single entry point for LLM calls:
 * input guardrails → cache → router → resilient provider pool → output guardrails → HITL → telemetry.
 */
export async function runAI(opts: RunAIOptions): Promise<RunAIResult> {
  const traceId = opts.gateway?.requestId ?? nanoid(16);
  const t0 = Date.now();
  const tracer = createTracer();
  const userId = opts.gateway?.userId ?? null;
  const prompt = lastUser(opts.messages);
  const base = { traceId, userId, feature: opts.feature, promptSnippet: prompt };

  // 1. Input guardrails
  let s = tracer.start("input_guardrails");
  const inCheck = await checkInput(prompt, { failClosed: opts.failClosed, skipClassifier: opts.trustedInput });
  s.end({ stage: inCheck.stage, severity: inCheck.severity, redactions: inCheck.redactions });
  if (!inCheck.isSafe) {
    await recordTrace({ ...base, model: "guardrail", latencyMs: Date.now() - t0, guardrailPassed: false, flaggedReason: inCheck.flaggedReason, status: "flagged", spans: tracer.spans });
    throw new AIError("GUARDRAIL_BLOCKED", "This request can't be processed. Please rephrase and keep it learning-focused.", { reason: inCheck.flaggedReason });
  }
  const messages = withSanitised(opts.messages, inCheck.sanitizedInput);

  // 2. Cache
  const scope = {
    feature: opts.feature,
    contextKey: hashContext(systemOf(messages) + (opts.json ? ":json" : "")),
    userId: opts.cache && opts.cache.private ? userId ?? undefined : undefined,
  };
  // Only cache single-turn style requests; multi-turn answers depend on history.
  const cacheable = opts.cache !== false && messages.filter((m) => m.role !== "system").length <= 1;
  let vector: number[] | undefined;
  if (cacheable) {
    s = tracer.start("cache_lookup");
    const r = await cacheLookup(scope, inCheck.sanitizedInput);
    vector = r.vector;
    s.end({ hit: r.hit?.kind ?? null, sim: r.hit?.similarity });
    if (r.hit) {
      const latencyMs = Date.now() - t0;
      await recordTrace({ ...base, model: r.hit.model, provider: "cache", latencyMs, cacheHit: r.hit.kind, responseSnippet: r.hit.response, status: "success", spans: tracer.spans });
      return { traceId, text: r.hit.response, model: r.hit.model, provider: "cache", tier: "fast", cached: r.hit.kind, fallbackUsed: false, costUsd: 0, latencyMs };
    }
  }

  // 3. Route
  const route = routeRequest(opts.feature, messages, opts.tier);

  // 4. Generate
  s = tracer.start("llm");
  let res;
  try {
    res = await complete({ tier: route.tier, messages, temperature: opts.temperature, maxTokens: opts.maxTokens, json: opts.json });
    s.end({ provider: res.provider, model: res.model, attempts: res.attempts });
  } catch (err) {
    s.end({ error: (err as Error).message });
    await recordTrace({ ...base, model: "n/a", tier: route.tier, latencyMs: Date.now() - t0, status: "error", errorType: (err as AIError).code ?? "unknown", spans: tracer.spans });
    throw err;
  }

  // 5. Output guardrails
  s = tracer.start("output_guardrails");
  const out = await checkOutput(res.text, { context: opts.context, systemPrompt: systemOf(messages), llmJudge: Boolean(opts.context) });
  s.end({ issues: out.issues, groundedness: out.groundedness });

  // 6. HITL
  const risk = riskScore(opts.feature, { guardrailIssues: out.issues, groundedness: out.groundedness, inputSeverity: inCheck.severity });
  let review: RunAIResult["review"];
  if (risk >= 0.5) {
    const reason = out.issues.join(", ") || "high_stakes_feature";
    await enqueueReview({ traceId, feature: opts.feature, userId, input: inCheck.sanitizedInput, output: res.text, reason, riskScore: risk, metadata: { model: res.model, groundedness: out.groundedness } });
    review = { queued: true, reason };
  }

  const latencyMs = Date.now() - t0;
  if (opts.gateway) await chargeTokens(opts.gateway.principalId, res.promptTokens + res.completionTokens);

  // 7. Cache store (only clean, reviewed-not-needed answers)
  if (cacheable && out.isSafe && !review) {
    await cacheStore(scope, inCheck.sanitizedInput, out.sanitizedOutput, res.model, { vector, docIds: opts.docIds, ttlSec: opts.cache ? opts.cache.ttlSec : undefined });
  }

  await recordTrace({
    ...base,
    model: res.model,
    provider: res.provider,
    tier: route.tier,
    responseSnippet: out.sanitizedOutput,
    promptTokens: res.promptTokens,
    completionTokens: res.completionTokens,
    latencyMs,
    costUsd: res.costUsd,
    fallbackUsed: res.fallbackUsed,
    guardrailPassed: out.isSafe,
    flaggedReason: out.issues.join(", ") || null,
    status: review ? "review" : out.isSafe ? "success" : "flagged",
    spans: tracer.spans,
    metadata: { route },
  });

  return {
    traceId,
    text: out.sanitizedOutput,
    model: res.model,
    provider: res.provider,
    tier: route.tier,
    cached: null,
    fallbackUsed: res.fallbackUsed,
    costUsd: res.costUsd,
    latencyMs,
    review,
    groundedness: out.groundedness,
  };
}

/**
 * Streaming variant. Input guardrails + cache run before streaming; output checks,
 * HITL, caching and telemetry run after the stream completes (non-blocking for the user).
 */
export async function runAIStream(opts: RunAIOptions): Promise<{ traceId: string; stream: ReadableStream<Uint8Array>; cached: "exact" | "semantic" | null; tier: Tier }> {
  const traceId = opts.gateway?.requestId ?? nanoid(16);
  const t0 = Date.now();
  const tracer = createTracer();
  const userId = opts.gateway?.userId ?? null;
  const prompt = lastUser(opts.messages);
  const base = { traceId, userId, feature: opts.feature, promptSnippet: prompt };

  const inCheck = await checkInput(prompt, { failClosed: opts.failClosed, skipClassifier: opts.trustedInput });
  if (!inCheck.isSafe) {
    await recordTrace({ ...base, model: "guardrail", latencyMs: Date.now() - t0, guardrailPassed: false, flaggedReason: inCheck.flaggedReason, status: "flagged" });
    throw new AIError("GUARDRAIL_BLOCKED", "This request can't be processed. Please rephrase and keep it learning-focused.");
  }
  const messages = withSanitised(opts.messages, inCheck.sanitizedInput);

  const scope = {
    feature: opts.feature,
    contextKey: hashContext(systemOf(messages)),
    userId: opts.cache && opts.cache.private ? userId ?? undefined : undefined,
  };
  const cacheable = opts.cache !== false && messages.filter((m) => m.role !== "system").length <= 1;
  let vector: number[] | undefined;
  if (cacheable) {
    const r = await cacheLookup(scope, inCheck.sanitizedInput);
    vector = r.vector;
    if (r.hit) {
      await recordTrace({ ...base, model: r.hit.model, provider: "cache", latencyMs: Date.now() - t0, cacheHit: r.hit.kind, responseSnippet: r.hit.response, status: "success" });
      const enc = new TextEncoder();
      return {
        traceId,
        cached: r.hit.kind,
        tier: "fast",
        stream: new ReadableStream({ start(c) { c.enqueue(enc.encode(r.hit!.response)); c.close(); } }),
      };
    }
  }

  const route = routeRequest(opts.feature, messages, opts.tier);
  let sr;
  try {
    sr = await completeStream({ tier: route.tier, messages, temperature: opts.temperature, maxTokens: opts.maxTokens });
  } catch (err) {
    await recordTrace({ ...base, model: "n/a", tier: route.tier, latencyMs: Date.now() - t0, status: "error", errorType: (err as AIError).code ?? "unknown" });
    throw err;
  }

  // Post-processing after the stream finishes.
  void sr.done.then(async (d) => {
    const out = await checkOutput(d.text, { context: opts.context, systemPrompt: systemOf(messages) });
    const risk = riskScore(opts.feature, { guardrailIssues: out.issues, groundedness: out.groundedness, inputSeverity: inCheck.severity });
    if (risk >= 0.5) {
      await enqueueReview({ traceId, feature: opts.feature, userId, input: inCheck.sanitizedInput, output: d.text, reason: out.issues.join(", ") || "high_stakes_feature", riskScore: risk });
    }
    if (opts.gateway) await chargeTokens(opts.gateway.principalId, d.promptTokens + d.completionTokens);
    if (cacheable && out.isSafe && risk < 0.5) await cacheStore(scope, inCheck.sanitizedInput, out.sanitizedOutput, sr.model, { vector, docIds: opts.docIds });
    await recordTrace({
      ...base,
      model: sr.model,
      provider: sr.provider,
      tier: route.tier,
      responseSnippet: d.text,
      promptTokens: d.promptTokens,
      completionTokens: d.completionTokens,
      latencyMs: Date.now() - t0,
      costUsd: d.costUsd,
      fallbackUsed: sr.fallbackUsed,
      guardrailPassed: out.isSafe,
      flaggedReason: out.issues.join(", ") || null,
      status: risk >= 0.5 ? "review" : out.isSafe ? "success" : "flagged",
      spans: tracer.spans,
    });
  }).catch((e) => console.error("[ai-orchestrator] post-stream failed", e));

  return { traceId, stream: sr.stream, cached: null, tier: route.tier };
}
