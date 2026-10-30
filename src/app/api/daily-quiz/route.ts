import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { dailyQuizzes, clarityUserProgress } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { aiGateway, aiErrorResponse } from "@/lib/ai/gateway";
import { runAI } from "@/lib/ai/orchestrator";

export async function GET(req: NextRequest) {
  let requestId: string | undefined;
  try {
    const gw = await aiGateway();
    requestId = gw.requestId;
    const userId = gw.userId!;

    const [latestQuiz] = await db
      .select()
      .from(dailyQuizzes)
      .where(eq(dailyQuizzes.userId, userId))
      .orderBy(desc(dailyQuizzes.createdAt))
      .limit(1);

    if (latestQuiz) {
      return NextResponse.json({ quiz: latestQuiz });
    }

    // Generate immediate quiz if none exists yet
    const topic = "General Science & Computer Science";
    const prompt = `Generate a 5-question multiple-choice warm-up quiz for a student learning about "${topic}".
Output MUST be a JSON array of 5 questions.
Each question object MUST have:
- "id": number (1 to 5)
- "question": string
- "options": array of 4 string options
- "correctAnswer": number (index 0 to 3)
- "explanation": string detailing why the answer is correct`;

    const r = await runAI({
      feature: "daily_quiz",
      gateway: gw,
      messages: [
        { role: "system", content: "You are an expert AI tutor. Generate clean JSON array only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      trustedInput: true,
    });

    const raw = r.text || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    const questionsJson = match ? match[0] : "[]";

    const [newQuiz] = await db
      .insert(dailyQuizzes)
      .values({
        userId,
        topic,
        questions: questionsJson,
        score: 0,
        completed: false,
      })
      .returning();

    return NextResponse.json({ quiz: newQuiz, traceId: r.traceId });
  } catch (error: any) {
    return aiErrorResponse(error, requestId);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, score } = await req.json();

    if (!quizId || typeof score !== "number") {
      return NextResponse.json({ error: "Missing quizId or score" }, { status: 400 });
    }

    await db
      .update(dailyQuizzes)
      .set({
        score,
        completed: true,
      })
      .where(eq(dailyQuizzes.id, quizId));

    // Award XP
    const xpReward = score * 10 + 20; // e.g. 5/5 -> 70 XP
    const [progress] = await db
      .select()
      .from(clarityUserProgress)
      .where(eq(clarityUserProgress.userId, session.user.id));

    if (progress) {
      await db
        .update(clarityUserProgress)
        .set({
          xp: progress.xp + xpReward,
          lastActiveAt: new Date(),
        })
        .where(eq(clarityUserProgress.userId, session.user.id));
    } else {
      await db.insert(clarityUserProgress).values({
        userId: session.user.id,
        xp: xpReward,
        streakDays: 1,
        lastActiveAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, xpEarned: xpReward });
  } catch (error: any) {
    console.error("Submit Quiz error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
