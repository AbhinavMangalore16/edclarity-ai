import { inngest } from "../client";
import { db } from "@/db";
import { flashcards, spacedRepetitionReviews } from "@/db/schema";
import { lte } from "drizzle-orm";

/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm
 * @param quality Rating 0 to 5 (0=blackout, 3=pass with effort, 5=perfect)
 * @param easeFactor Current EF (default 2.5)
 * @param interval Current interval in days
 * @param repetitions Current repetition count
 */
export function calculateSM2(
  quality: number,
  easeFactor: number,
  interval: number,
  repetitions: number
) {
  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor.toFixed(2),
    interval: newInterval,
    repetitions: newRepetitions,
    dueDate,
  };
}

export const spacedRepetitionCron = inngest.createFunction(
  { id: "spaced-repetition-cron", triggers: [{ cron: "0 8 * * *" }] },
  async ({ step }: any) => {
    const now = new Date();

    // 1. Fetch flashcards due for review
    const dueFlashcards = await step.run("fetch-due-flashcards", async () => {
      return await db.select().from(flashcards).where(lte(flashcards.dueDate, now));
    });

    // 2. Fetch lesson topics due for review
    const dueReviews = await step.run("fetch-due-reviews", async () => {
      return await db
        .select()
        .from(spacedRepetitionReviews)
        .where(lte(spacedRepetitionReviews.dueDate, now));
    });

    return {
      success: true,
      dueFlashcardCount: dueFlashcards.length,
      dueReviewCount: dueReviews.length,
      timestamp: now.toISOString(),
    };
  }
);
