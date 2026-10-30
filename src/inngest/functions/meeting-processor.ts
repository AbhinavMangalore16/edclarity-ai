import { inngest } from "../client";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AICREDITS_KEY,
  baseURL: "https://api.aicredits.in/v1",
});

export const processMeetingSummary = inngest.createFunction(
  { 
    id: "process-meeting-summary", 
    triggers: [{ event: "meeting/finished" }],
    concurrency: { limit: 1, key: "event.data.meetingId" }
  },
  async ({ event, step }: any) => {
    const { meetingId } = event.data;

    // Fetch the transcript
    const meeting = await step.run("fetch-meeting", async () => {
      const [m] = await db.select().from(meetings).where(eq(meetings.id, meetingId));
      return m;
    });

    if (!meeting || !meeting.transcript) {
      return { skipped: true, reason: "Meeting not found or has no transcript" };
    }

    if (meeting.status === "completed") {
      return { skipped: true, reason: "Meeting processing already completed" };
    }

    const transcriptData = JSON.parse(meeting.transcript);

    // Generate summary
    const summary = await step.run("generate-summary", async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an AI assistant tasked with summarizing a meeting transcript between an AI agent and a user. Provide a concise summary and list any key action items." },
          { role: "user", content: `Here is the transcript:\n\n${JSON.stringify(transcriptData, null, 2)}` }
        ],
        temperature: 0.5,
      });
      return response.choices[0]?.message?.content || "No summary generated.";
    });

    // Update DB
    await step.run("update-meeting-status", async () => {
      await db.update(meetings).set({
        summary: summary,
        status: "completed"
      }).where(eq(meetings.id, meetingId));
    });

    // Extract Study Flashcards from Meeting Transcript
    await step.run("generate-meeting-flashcards", async () => {
      try {
        const { flashcards } = await import("@/db/schema");
        // Clear old flashcards for this meeting to prevent duplicates
        await db.delete(flashcards).where(eq(flashcards.meetingId, meeting.id));

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an AI study assistant. Extract 3 to 5 key educational flashcards from this meeting transcript. Return a JSON array of objects with keys: 'topic', 'question', 'answer'."
            },
            {
              role: "user",
              content: `Transcript:\n${JSON.stringify(transcriptData, null, 2)}`
            }
          ],
          temperature: 0.7,
        });

        const raw = response.choices[0]?.message?.content || "[]";
        const match = raw.match(/\[[\s\S]*\]/);
        const cards = match ? JSON.parse(match[0]) : [];

        for (const card of cards) {
          if (card.question && card.answer) {
            await db.insert(flashcards).values({
              userId: meeting.userId,
              meetingId: meeting.id,
              topic: card.topic || meeting.name || "AI Meeting Notes",
              question: card.question,
              answer: card.answer,
              easeFactor: "2.5",
              interval: 1,
              repetitions: 0,
              dueDate: new Date(),
            });
          }
        }
      } catch (err) {
        console.error("Failed to generate meeting flashcards:", err);
      }
    });

    return { success: true, meetingId, summary };
  }
);
