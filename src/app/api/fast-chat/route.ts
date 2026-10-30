import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiGateway, aiErrorResponse } from "@/lib/ai/gateway";
import { runAI, runAIStream } from "@/lib/ai/orchestrator";

const Body = z.object({
  prompt: z.string().min(1).max(32_000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(16_000) }))
    .max(40)
    .optional(),
  model: z.enum(["8b", "70b", "auto"]).optional(),
  stream: z.boolean().optional(),
});

const SYSTEM =
  "You are EdClarity AI Fast Tutor. Provide clear, accurate, concise answers. If unsure, say so rather than guessing.";

export async function POST(req: NextRequest) {
  let requestId: string | undefined;
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    const { prompt, history = [], model = "auto", stream = false } = parsed.data;

    const gw = await aiGateway({ inputChars: prompt.length });
    requestId = gw.requestId;

    const messages = [{ role: "system" as const, content: SYSTEM }, ...history, { role: "user" as const, content: prompt }];
    const tier = model === "8b" ? "fast" : model === "70b" ? "balanced" : undefined;

    if (stream) {
      const r = await runAIStream({ feature: "fast_chat", messages, gateway: gw, tier });
      return new Response(r.stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Trace-Id": r.traceId,
          "X-Cache": r.cached ?? "miss",
          "X-Model-Tier": r.tier,
        },
      });
    }

    const r = await runAI({ feature: "fast_chat", messages, gateway: gw, tier });
    return NextResponse.json(
      {
        reply: r.text,
        engine: r.provider,
        model: r.model,
        tier: r.tier,
        cached: r.cached,
        traceId: r.traceId,
        timestamp: new Date().toISOString(),
      },
      { headers: { "X-Trace-Id": r.traceId } }
    );
  } catch (error) {
    return aiErrorResponse(error, requestId);
  }
}
