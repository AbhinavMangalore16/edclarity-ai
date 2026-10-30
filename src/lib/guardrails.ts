import "server-only";
import { checkInput, heuristicCheck } from "./ai/guardrails";

/** Legacy compatibility layer — prefer `checkInput` / `checkOutput` from `@/lib/ai/guardrails`. */
export interface GuardrailResult {
  isSafe: boolean;
  flaggedReason?: string;
  sanitizedInput: string;
}

export function fastLingoCheck(input: string): { isSafe: boolean; reason?: string } {
  return heuristicCheck(input);
}

export async function checkInputGuardrail(input: string): Promise<GuardrailResult> {
  const r = await checkInput(input);
  return { isSafe: r.isSafe, flaggedReason: r.flaggedReason, sanitizedInput: r.sanitizedInput };
}
