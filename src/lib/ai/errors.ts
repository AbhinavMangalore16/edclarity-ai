export type AIErrorCode =
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "UNAUTHORIZED"
  | "GUARDRAIL_BLOCKED"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "BAD_REQUEST";

const STATUS: Record<AIErrorCode, number> = {
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 402,
  UNAUTHORIZED: 401,
  GUARDRAIL_BLOCKED: 422,
  PROVIDER_UNAVAILABLE: 503,
  TIMEOUT: 504,
  BAD_REQUEST: 400,
};

export class AIError extends Error {
  readonly status: number;
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly meta: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "AIError";
    this.status = STATUS[code];
  }
}

/** Errors worth retrying / failing over on (429, 5xx, network, timeouts). */
export function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; code?: string; name?: string };
  if (e?.name === "AbortError" || e?.name === "TimeoutError") return true;
  if (typeof e?.status === "number") return e.status === 429 || e.status >= 500;
  return ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(e?.code ?? "");
}
