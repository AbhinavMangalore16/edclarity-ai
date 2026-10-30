import "server-only";
import OpenAI from "openai";
import { aiEnv } from "./env";
import { kv } from "./kv";
import { AIError, isRetryable } from "./errors";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Tier = "fast" | "balanced" | "reasoning";

export interface ProviderSpec {
  name: string;
  client: () => OpenAI | null;
  /** Model per tier for this provider. */
  models: Record<Tier, string>;
}

/** USD per 1M tokens [input, output]. Used for cost telemetry; update as prices change. */
export const PRICING: Record<string, [number, number]> = {
  "llama-3.1-8b-instant": [0.05, 0.08],
  "llama-3.3-70b-versatile": [0.59, 0.79],
  "openai/gpt-oss-120b": [0.15, 0.75],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-flash-lite": [0.1, 0.4],
  "gemini-2.5-pro": [1.25, 10],
};

export function estimateCost(model: string, promptTokens = 0, completionTokens = 0) {
  const [i, o] = PRICING[model] ?? [0, 0];
  return (promptTokens * i + completionTokens * o) / 1_000_000;
}

const lazy = (fn: () => OpenAI | null) => {
  let c: OpenAI | null | undefined;
  return () => (c === undefined ? (c = fn()) : c);
};

/** Ordered by preference. The pool fails over down this list. */
export const PROVIDERS: ProviderSpec[] = [
  {
    name: "groq",
    client: lazy(() =>
      aiEnv.GROQ_API_KEY
        ? new OpenAI({ apiKey: aiEnv.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1", maxRetries: 0 })
        : null
    ),
    models: { fast: "llama-3.1-8b-instant", balanced: "llama-3.3-70b-versatile", reasoning: "openai/gpt-oss-120b" },
  },
  {
    name: "gemini",
    client: lazy(() =>
      aiEnv.GEMINI_API_KEY
        ? new OpenAI({
            apiKey: aiEnv.GEMINI_API_KEY,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
            maxRetries: 0,
          })
        : null
    ),
    models: { fast: "gemini-2.5-flash-lite", balanced: "gemini-2.5-flash", reasoning: "gemini-2.5-pro" },
  },
  {
    name: "aicredits",
    client: lazy(() =>
      aiEnv.AICREDITS_KEY
        ? new OpenAI({ apiKey: aiEnv.AICREDITS_KEY, baseURL: "https://api.aicredits.in/v1", maxRetries: 0 })
        : null
    ),
    models: { fast: "gpt-4o-mini", balanced: "gpt-4o-mini", reasoning: "gpt-4o" },
  },
];

// ---------------- Circuit breaker (shared via KV) ----------------
const CB_FAIL_THRESHOLD = 5; // failures within window
const CB_WINDOW_SEC = 60;
const CB_OPEN_SEC = 30; // cool-down before half-open probe

async function isOpen(provider: string) {
  return Boolean(await kv.get<number>(`cb:open:${provider}`));
}
async function recordFailure(provider: string) {
  const n = await kv.incr(`cb:fail:${provider}`, CB_WINDOW_SEC);
  if (n >= CB_FAIL_THRESHOLD) {
    await kv.set(`cb:open:${provider}`, Date.now(), CB_OPEN_SEC);
    await kv.del(`cb:fail:${provider}`);
  }
}
async function recordSuccess(provider: string) {
  await kv.del(`cb:fail:${provider}`);
}

export async function providerHealth() {
  return Promise.all(
    PROVIDERS.map(async (p) => ({
      name: p.name,
      configured: Boolean(p.client()),
      circuitOpen: await isOpen(p.name),
    }))
  );
}

// ---------------- Retry helpers ----------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => Math.min(2000, 200 * 2 ** attempt) * (0.5 + Math.random());

export interface CompletionOptions {
  tier: Tier;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
  retriesPerProvider?: number;
  /** Restrict to a subset of providers (e.g. for guardrails). */
  providers?: string[];
}

export interface CompletionResult {
  text: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  fallbackUsed: boolean;
  attempts: number;
}

function candidates(opts: CompletionOptions) {
  return PROVIDERS.filter((p) => p.client() && (!opts.providers || opts.providers.includes(p.name)));
}

/**
 * Resilient completion: per-provider timeout + retries with jittered backoff on
 * retryable errors, circuit breaker, then failover to the next provider.
 */
export async function complete(opts: CompletionOptions): Promise<CompletionResult> {
  const list = candidates(opts);
  if (!list.length) throw new AIError("PROVIDER_UNAVAILABLE", "No LLM provider configured.");
  let attempts = 0;
  let lastErr: unknown;

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (await isOpen(p.name)) continue;
    const model = p.models[opts.tier];
    const retries = opts.retriesPerProvider ?? 1;

    for (let a = 0; a <= retries; a++) {
      attempts++;
      try {
        const res = await p.client()!.chat.completions.create(
          {
            model,
            messages: opts.messages,
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.maxTokens,
            ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
          },
          { signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000) }
        );
        await recordSuccess(p.name);
        const pt = res.usage?.prompt_tokens ?? 0;
        const ct = res.usage?.completion_tokens ?? 0;
        return {
          text: res.choices[0]?.message?.content ?? "",
          provider: p.name,
          model,
          promptTokens: pt,
          completionTokens: ct,
          costUsd: estimateCost(model, pt, ct),
          fallbackUsed: i > 0,
          attempts,
        };
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err)) break; // 4xx: don't hammer, try next provider
        await recordFailure(p.name);
        if (a < retries) await sleep(backoff(a));
      }
    }
  }
  throw new AIError("PROVIDER_UNAVAILABLE", "All LLM providers failed.", {
    cause: (lastErr as Error)?.message,
  });
}

export interface StreamResult {
  stream: ReadableStream<Uint8Array>;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  /** Resolves with final text + usage once the stream finishes. */
  done: Promise<{ text: string; promptTokens: number; completionTokens: number; costUsd: number }>;
}

/**
 * Streaming with failover. Failover is only possible before the first token is
 * emitted (we open the upstream stream and await the first chunk before
 * returning), so users never see a half answer stitched from two providers.
 */
export async function completeStream(opts: CompletionOptions): Promise<StreamResult> {
  const list = candidates(opts);
  if (!list.length) throw new AIError("PROVIDER_UNAVAILABLE", "No LLM provider configured.");
  let lastErr: unknown;

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (await isOpen(p.name)) continue;
    const model = p.models[opts.tier];
    try {
      const upstream = await p.client()!.chat.completions.create(
        {
          model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000) }
      );
      const it = upstream[Symbol.asyncIterator]();
      const first = await it.next(); // surfaces connection/auth errors before we commit
      await recordSuccess(p.name);

      const encoder = new TextEncoder();
      let full = "";
      let pt = 0;
      let ct = 0;
      let resolveDone!: (v: { text: string; promptTokens: number; completionTokens: number; costUsd: number }) => void;
      const done = new Promise<{ text: string; promptTokens: number; completionTokens: number; costUsd: number }>(
        (r) => (resolveDone = r)
      );

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const handle = (chunk: OpenAI.Chat.Completions.ChatCompletionChunk) => {
            const c = chunk.choices?.[0]?.delta?.content ?? "";
            if (c) {
              full += c;
              controller.enqueue(encoder.encode(c));
            }
            if (chunk.usage) {
              pt = chunk.usage.prompt_tokens ?? pt;
              ct = chunk.usage.completion_tokens ?? ct;
            }
          };
          try {
            if (!first.done) handle(first.value);
            for (let r = await it.next(); !r.done; r = await it.next()) handle(r.value);
          } catch (e) {
            controller.enqueue(encoder.encode("\n\n[stream interrupted]"));
            await recordFailure(p.name);
          } finally {
            controller.close();
            resolveDone({ text: full, promptTokens: pt, completionTokens: ct, costUsd: estimateCost(model, pt, ct) });
          }
        },
      });
      return { stream, provider: p.name, model, fallbackUsed: i > 0, done };
    } catch (err) {
      lastErr = err;
      if (isRetryable(err)) await recordFailure(p.name);
    }
  }
  throw new AIError("PROVIDER_UNAVAILABLE", "All LLM providers failed (stream).", {
    cause: (lastErr as Error)?.message,
  });
}
