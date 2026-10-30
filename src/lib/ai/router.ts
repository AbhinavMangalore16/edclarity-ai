import "server-only";
import type { ChatMessage, Tier } from "./providers";

export type Feature =
  | "clarities"
  | "persona_qna"
  | "meeting_transcription"
  | "ai_notetaker"
  | "agent_chat"
  | "fast_chat"
  | "flashcards"
  | "daily_quiz"
  | "rag";

export interface RouteDecision {
  tier: Tier;
  score: number;
  reasons: string[];
}

/** Per-feature floor/ceiling so e.g. quiz generation never drops to the 8B model. */
const FEATURE_BOUNDS: Partial<Record<Feature, { min?: Tier; max?: Tier }>> = {
  fast_chat: { max: "balanced" },
  daily_quiz: { min: "balanced" },
  flashcards: { min: "balanced" },
  clarities: { min: "balanced" },
  ai_notetaker: { min: "balanced" },
};

const ORDER: Tier[] = ["fast", "balanced", "reasoning"];
const clamp = (t: Tier, b?: { min?: Tier; max?: Tier }) => {
  let i = ORDER.indexOf(t);
  if (b?.min) i = Math.max(i, ORDER.indexOf(b.min));
  if (b?.max) i = Math.min(i, ORDER.indexOf(b.max));
  return ORDER[i];
};

const REASONING_HINTS =
  /\b(prove|derive|step[- ]by[- ]step|why does|compare|analy[sz]e|optimi[sz]e|debug|complexity|algorithm|integral|differentiat|theorem|design|trade-?offs?|explain in detail)\b/i;
const CODE_HINT = /```|\bfunction\b|\bdef\b|\bclass\b|=>|#include|SELECT\s+.+FROM/i;
const MATH_HINT = /[∑∫√π]|\\frac|\\int|\^\d|\d+\s*[*/^]\s*\d+/;
const SMALLTALK = /^(hi|hey|hello|thanks|thank you|ok|okay|cool|bye|good (morning|night))\b[\s!.?]*$/i;

/**
 * Fast heuristic complexity router (no extra LLM hop, ~0ms).
 * Score ≥ 0.6 → reasoning, ≥ 0.25 → balanced, else fast.
 */
export function routeRequest(feature: Feature, messages: ChatMessage[], override?: Tier): RouteDecision {
  if (override) return { tier: clamp(override, FEATURE_BOUNDS[feature]), score: -1, reasons: ["override"] };

  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const reasons: string[] = [];
  let score = 0;

  if (SMALLTALK.test(last.trim())) {
    reasons.push("smalltalk");
    score = 0;
  } else {
    const len = last.length;
    if (len > 300) (score += 0.15), reasons.push("long_prompt");
    if (len > 1200) (score += 0.15), reasons.push("very_long_prompt");
    if (REASONING_HINTS.test(last)) (score += 0.35), reasons.push("reasoning_keywords");
    if (CODE_HINT.test(last)) (score += 0.25), reasons.push("code");
    if (MATH_HINT.test(last)) (score += 0.25), reasons.push("math");
    if ((last.match(/\?/g)?.length ?? 0) >= 3) (score += 0.1), reasons.push("multi_question");
    const turns = messages.filter((m) => m.role !== "system").length;
    if (turns > 10) (score += 0.1), reasons.push("long_conversation");
    if (len > 0 && len < 300 && !reasons.length) score += 0.1;
  }

  score = Math.min(1, score);
  const tier: Tier = score >= 0.6 ? "reasoning" : score >= 0.25 ? "balanced" : "fast";
  return { tier: clamp(tier, FEATURE_BOUNDS[feature]), score, reasons };
}
