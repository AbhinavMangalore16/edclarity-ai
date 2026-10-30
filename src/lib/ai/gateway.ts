import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { headers as nextHeaders } from "next/headers";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { kv, redis } from "./kv";
import { AIError } from "./errors";

export type Plan = "anonymous" | "free" | "pro" | "admin";

/** Requests per minute + daily token budget per plan. */
export const LIMITS: Record<Plan, { rpm: number; dailyTokens: number; maxInputChars: number }> = {
  anonymous: { rpm: 5, dailyTokens: 10_000, maxInputChars: 2_000 },
  free: { rpm: 20, dailyTokens: 150_000, maxInputChars: 8_000 },
  pro: { rpm: 60, dailyTokens: 2_000_000, maxInputChars: 16_000 },
  admin: { rpm: 300, dailyTokens: 50_000_000, maxInputChars: 32_000 },
};

const limiters = new Map<Plan, Ratelimit>();
function upstashLimiter(plan: Plan) {
  if (!redis) return null;
  if (!limiters.has(plan)) {
    limiters.set(
      plan,
      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS[plan].rpm, "1 m"), prefix: `rl:${plan}`, analytics: true })
    );
  }
  return limiters.get(plan)!;
}

async function rateLimit(plan: Plan, id: string) {
  const l = upstashLimiter(plan);
  if (l) {
    const r = await l.limit(id);
    return { ok: r.success, remaining: r.remaining, reset: r.reset };
  }
  // Fixed-window fallback (dev).
  const window = Math.floor(Date.now() / 60_000);
  const n = await kv.incr(`rl:${plan}:${id}:${window}`, 70);
  return { ok: n <= LIMITS[plan].rpm, remaining: Math.max(0, LIMITS[plan].rpm - n), reset: (window + 1) * 60_000 };
}

const dayKey = (id: string) => `tok:${id}:${new Date().toISOString().slice(0, 10)}`;

export async function chargeTokens(principalId: string, tokens: number) {
  if (tokens <= 0) return;
  const key = dayKey(principalId);
  if (redis) {
    const n = await redis.incrby(key, tokens);
    if (n === tokens) await redis.expire(key, 60 * 60 * 26);
    return;
  }
  const current = (await kv.get<number>(key)) ?? 0;
  await kv.set(key, current + tokens, 60 * 60 * 26);
}

export interface GatewayContext {
  requestId: string;
  userId: string | null;
  principalId: string;
  plan: Plan;
  ip: string;
  limits: (typeof LIMITS)[Plan];
}

export interface GatewayOptions {
  /** Reject unauthenticated callers (default true). */
  requireAuth?: boolean;
  /** Rough size of the incoming prompt to enforce maxInputChars. */
  inputChars?: number;
}

/**
 * AI Gateway: authenticate, identify plan, enforce rate limit, daily token budget
 * and payload size. Use at the top of every AI route handler / tRPC procedure.
 */
export async function aiGateway(opts: GatewayOptions = {}): Promise<GatewayContext> {
  const h = await nextHeaders();
  const requestId = h.get("x-request-id") ?? nanoid(16);
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown").split(",")[0].trim();

  const session = await auth.api.getSession({ headers: h }).catch(() => null);
  if (!session && opts.requireAuth !== false) throw new AIError("UNAUTHORIZED", "Sign in to use AI features.");

  let plan: Plan = "anonymous";
  const userId = session?.user?.id ?? null;
  if (userId) {
    const u = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { role: true, isPro: true } });
    plan = u?.role === "admin" ? "admin" : u?.isPro ? "pro" : "free";
  }
  const principalId = userId ?? `ip:${ip}`;
  const limits = LIMITS[plan];

  if (opts.inputChars && opts.inputChars > limits.maxInputChars) {
    throw new AIError("BAD_REQUEST", `Input too long for your plan (max ${limits.maxInputChars} chars).`);
  }

  const rl = await rateLimit(plan, principalId);
  if (!rl.ok) throw new AIError("RATE_LIMITED", "Too many requests. Please slow down.", { reset: rl.reset });

  const used = (await kv.get<number>(dayKey(principalId))) ?? 0;
  if (used >= limits.dailyTokens) {
    throw new AIError("QUOTA_EXCEEDED", plan === "pro" ? "Daily AI budget reached." : "Daily free AI limit reached. Upgrade to Pro for more.");
  }

  return { requestId, userId, principalId, plan, ip, limits };
}

/** Convert AIError (or anything) to a JSON Response for route handlers. */
export function aiErrorResponse(err: unknown, requestId?: string) {
  if (err instanceof AIError) {
    return Response.json(
      { error: err.message, code: err.code, requestId },
      { status: err.status, headers: err.code === "RATE_LIMITED" ? { "Retry-After": "60" } : undefined }
    );
  }
  console.error("[ai-gateway] unhandled", err);
  return Response.json({ error: "Internal error", code: "INTERNAL", requestId }, { status: 500 });
}
