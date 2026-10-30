import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ragFeedback } from "@/db/schema";
import { aiGateway, aiErrorResponse } from "@/lib/ai/gateway";
import { enqueueReview } from "@/lib/ai/hitl";

const FeedbackBody = z.object({
  traceId: z.string().optional(),
  query: z.string().min(1).max(4000),
  docId: z.string().default("answer"),
  rank: z.number().int().min(0).default(0),
  event: z.enum(["impression", "click", "cited", "thumbs_up", "thumbs_down", "dwell"]),
  value: z.number().default(1),
  features: z.record(z.string(), z.unknown()).optional(),
  answerSnippet: z.string().optional(),
});

const LIBRARAG_URL = process.env.LIBRARAG_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  let requestId: string | undefined;
  try {
    const parsed = FeedbackBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid feedback payload", issues: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const gw = await aiGateway({ requireAuth: false });
    requestId = gw.requestId;

    const [row] = await db
      .insert(ragFeedback)
      .values({
        traceId: data.traceId ?? gw.requestId,
        userId: gw.userId,
        query: data.query,
        docId: data.docId,
        rank: data.rank,
        event: data.event,
        value: data.value,
        features: data.features ?? null,
      })
      .returning({ id: ragFeedback.id });

    // Escalate explicit negative feedback to the Human-in-the-Loop review queue
    if (data.event === "thumbs_down") {
      await enqueueReview({
        traceId: data.traceId ?? gw.requestId,
        feature: "rag",
        userId: gw.userId,
        input: data.query,
        output: data.answerSnippet,
        reason: "user_thumbs_down",
        riskScore: 0.65,
        metadata: { docId: data.docId, rank: data.rank },
      });
    }

    // Forward signal to LibraRAG LTR collector best-effort
    void fetch(`${LIBRARAG_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trace_id: data.traceId ?? gw.requestId,
        user_id: gw.userId,
        query: data.query,
        doc_id: data.docId,
        rank: data.rank,
        event: data.event,
        value: data.value,
        features: data.features ?? {},
      }),
    }).catch(() => null);

    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    return aiErrorResponse(error, requestId);
  }
}

