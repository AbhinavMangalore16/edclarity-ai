import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { aiGateway, aiErrorResponse } from "@/lib/ai/gateway";
import { runAI } from "@/lib/ai/orchestrator";
import { AIError } from "@/lib/ai/errors";

const Body = z.object({
  meetingId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.string(),
        text: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .min(1)
    .max(60),
});

export async function POST(req: NextRequest) {
  let requestId: string | undefined;
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing meetingId or messages" }, { status: 400 });
    }
    const { meetingId, messages } = parsed.data;

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user" || m.role === "student");
    const lastText = lastUserMessage?.text || lastUserMessage?.content || "";

    const gw = await aiGateway({ inputChars: lastText.length });
    requestId = gw.requestId;

    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, meeting.agentId));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const systemInstruction = `You are EdClarity AI, an engaging, interactive personal tutor in a live meeting.
CRITICAL CONVERSATIONAL RULES:
1. NEVER deliver long monologues or act like a blabbermouth. Keep your replies concise (2 to 3 sentences maximum).
2. ALWAYS interact: after explaining a concept step, end your reply with a brief, engaging follow-up question (e.g., "Does that make sense so far?", "What do you think happens next?", or "Would you like an example?").
3. Use a warm, encouraging tone.

Base Instructions:
${agent.instructions || "Help the student learn actively and effectively."}`;

    const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemInstruction },
      ...messages.map((m) => ({
        role: (m.role === "agent" || m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: m.text || m.content || "",
      })),
    ];

    try {
      const r = await runAI({
        feature: "agent_chat",
        messages: apiMessages,
        gateway: gw,
        cache: false,
      });

      return NextResponse.json(
        { reply: r.text, traceId: r.traceId, model: r.model, tier: r.tier },
        { headers: { "X-Trace-Id": r.traceId } }
      );
    } catch (err) {
      if (err instanceof AIError && err.code === "GUARDRAIL_BLOCKED") {
        return NextResponse.json(
          { reply: `[Guardrail Alert]: ${err.message}` },
          { status: 200 }
        );
      }
      throw err;
    }
  } catch (error) {
    return aiErrorResponse(error, requestId);
  }
}

