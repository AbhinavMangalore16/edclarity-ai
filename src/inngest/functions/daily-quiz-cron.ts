import { inngest } from "../client";
import { db } from "@/db";
import { user, clarityCourses, dailyQuizzes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AICREDITS_KEY,
  baseURL: "https://api.aicredits.in/v1",
});

export const dailyQuizCron = inngest.createFunction(
  { id: "daily-quiz-cron", triggers: [{ cron: "0 9 * * *" }] },
  async ({ step }: any) => {
    // 1. Fetch active users
    const activeUsers = await step.run("fetch-active-users", async () => {
      return await db.select({ id: user.id, name: user.name }).from(user).limit(20);
    });

    let generatedCount = 0;

    for (const u of activeUsers) {
      await step.run(`generate-quiz-for-${u.id}`, async () => {
        // Find user's latest course or fallback to default STEM topic
        const [userCourse] = await db
          .select()
          .from(clarityCourses)
          .where(eq(clarityCourses.userId, u.id))
          .orderBy(desc(clarityCourses.createdAt))
          .limit(1);

        const topic = userCourse ? userCourse.topic : "General Science & Computer Science";

        const prompt = `Generate a 5-question multiple-choice warm-up quiz for a student learning about "${topic}".
Output MUST be a JSON array of 5 questions.
Each question object MUST have:
- "id": number (1 to 5)
- "question": string
- "options": array of 4 string options
- "correctAnswer": number (index 0 to 3)
- "explanation": string detailing why the answer is correct`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an expert AI tutor. Generate clean JSON array only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        });

        const raw = response.choices[0]?.message?.content || "[]";
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        const questionsJson = jsonMatch ? jsonMatch[0] : "[]";

        await db.insert(dailyQuizzes).values({
          userId: u.id,
          topic: topic,
          questions: questionsJson,
          score: 0,
          completed: false,
        });

        generatedCount++;
      });
    }

    return { success: true, count: generatedCount };
  }
);
