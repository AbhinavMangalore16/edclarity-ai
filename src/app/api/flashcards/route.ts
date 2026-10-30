import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { eq, lte } from "drizzle-orm";
import { calculateSM2 } from "@/inngest/functions/spaced-repetition-cron";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, session.user.id))
      .limit(30);

    return NextResponse.json({ flashcards: cards });
  } catch (error: any) {
    console.error("Flashcards API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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

    const { cardId, quality } = await req.json(); // quality: 0 (Again), 3 (Hard), 4 (Good), 5 (Easy)

    if (!cardId || typeof quality !== "number") {
      return NextResponse.json({ error: "Missing cardId or quality score" }, { status: 400 });
    }

    const [card] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, cardId));

    if (!card) {
      return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });
    }

    const currentEF = parseFloat(card.easeFactor || "2.5");
    const sm2Result = calculateSM2(
      quality,
      currentEF,
      card.interval,
      card.repetitions
    );

    await db
      .update(flashcards)
      .set({
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        dueDate: sm2Result.dueDate,
      })
      .where(eq(flashcards.id, cardId));

    return NextResponse.json({ success: true, updatedCard: sm2Result });
  } catch (error: any) {
    console.error("SM-2 Flashcard Review Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
