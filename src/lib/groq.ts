import "server-only";
import { complete, completeStream, type ChatMessage, type Tier } from "./ai/providers";

/**
 * Legacy compatibility layer. New code should use `runAI` / `runAIStream`
 * from `@/lib/ai/orchestrator`. These helpers now route through the resilient
 * multi-provider pool (timeouts, retries, circuit breaker, failover).
 *
 * NOTE: the previously hardcoded Groq key was removed — set GROQ_API_KEY in .env
 * and rotate the old key in the Groq console.
 */

export const groqModels = {
  VERSATILE: "llama-3.3-70b-versatile",
  INSTANT: "llama-3.1-8b-instant",
} as const;

type LegacyModel = "llama-3.3-70b-versatile" | "llama-3.1-8b-instant";
const tierOf = (m: LegacyModel): Tier => (m === "llama-3.1-8b-instant" ? "fast" : "balanced");

export async function generateFastCompletion(
  messages: ChatMessage[],
  modelPreference: LegacyModel = "llama-3.3-70b-versatile"
): Promise<string> {
  const r = await complete({ tier: tierOf(modelPreference), messages });
  return r.text;
}

export async function streamFastCompletion(
  messages: ChatMessage[],
  modelPreference: LegacyModel = "llama-3.3-70b-versatile"
): Promise<ReadableStream<Uint8Array>> {
  const r = await completeStream({ tier: tierOf(modelPreference), messages });
  return r.stream;
}
