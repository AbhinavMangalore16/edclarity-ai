import { db } from "@/db";
import { clarityCourses, clarityModules, clarityLessons, clarityUserProgress, clarityLessonCompletions } from "@/db/schema";
import { createTRPCRouter, protectedProcedure, teacherProcedure } from "@/trpc/init";
import { and, eq, asc, desc } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AICREDITS_KEY,
  baseURL: "https://api.aicredits.in/v1",
});

export const clarityRouter = createTRPCRouter({
  getUserProgress: protectedProcedure.query(async ({ ctx }) => {
    let [progress] = await db
      .select()
      .from(clarityUserProgress)
      .where(eq(clarityUserProgress.userId, ctx.auth.user.id));

    if (!progress) {
      const [newProgress] = await db.insert(clarityUserProgress).values({
        userId: ctx.auth.user.id,
        xp: 0,
        streakDays: 0,
      }).returning();
      progress = newProgress;
    }

    const completions = await db
      .select({ completedAt: clarityLessonCompletions.completedAt })
      .from(clarityLessonCompletions)
      .where(eq(clarityLessonCompletions.userId, ctx.auth.user.id));

    const activeDays = completions
      .filter(c => c.completedAt)
      .map(c => c.completedAt!);

    return {
      ...progress,
      activeDays,
    };
  }),

  // Clarities are created/dictated by Teachers & Admins
  generateCourse: teacherProcedure
    .input(z.object({ topic: z.string().min(2), pdfText: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // PRO LIMIT CHECK
      const existingCourses = await db.select().from(clarityCourses).where(eq(clarityCourses.userId, ctx.auth.user.id));
      if (existingCourses.length >= 10 && !ctx.auth.user.isPro) {
        throw new TRPCError({ code: "FORBIDDEN", message: "PRO_REQUIRED" });
      }

      const pdfContextPrompt = input.pdfText
        ? `TEACHER UPLOADED REFERENCE MATERIAL (PDF/TEXTBOOK):\n"""\n${input.pdfText.slice(0, 35000)}\n"""\n\nSynthesize the above reference material directly into a structured, highly accurate course curriculum.`
        : `Generate a comprehensive course roadmap for the topic: "${input.topic}".`;

      const prompt = `${pdfContextPrompt}
Topic: "${input.topic}".
Create a title, a short description, and a list of modules. For each module, provide a title and a list of lesson titles. Ensure it progresses logically from beginner to advanced.`;

      const responseSchema = {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          modules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                lessons: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["title", "lessons"]
            }
          }
        },
        required: ["title", "description", "modules"]
      };

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt + "\n\nReturn ONLY valid JSON matching this schema:\n" + JSON.stringify(responseSchema, null, 2) }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const data = JSON.parse(response.choices[0]?.message?.content || "{}");

        // Save to DB
        const [course] = await db.insert(clarityCourses).values({
          title: data.title,
          description: data.description,
          topic: input.topic,
          userId: ctx.auth.user.id,
        }).returning();

        let mOrder = 0;
        for (const mod of data.modules) {
          const [moduleRec] = await db.insert(clarityModules).values({
            courseId: course.id,
            title: mod.title,
            orderIndex: mOrder++,
          }).returning();

          let lOrder = 0;
          for (const lessonTitle of mod.lessons) {
            await db.insert(clarityLessons).values({
              moduleId: moduleRec.id,
              title: lessonTitle,
              orderIndex: lOrder++,
              xpReward: 50,
            });
          }
        }

        return course;
      } catch (error) {
        console.error("Course Gen Error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate course" });
      }
    }),

  getCourses: protectedProcedure.query(async ({ ctx }) => {
    return await db.select().from(clarityCourses).where(eq(clarityCourses.userId, ctx.auth.user.id)).orderBy(desc(clarityCourses.createdAt));
  }),

  getCourseDetails: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input, ctx }) => {
      const [course] = await db.select().from(clarityCourses).where(eq(clarityCourses.id, input.courseId));
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });

      const modules = await db.select().from(clarityModules).where(eq(clarityModules.courseId, course.id)).orderBy(asc(clarityModules.orderIndex));
      
      const moduleIds = modules.map(m => m.id);
      let lessons: typeof clarityLessons.$inferSelect[] = [];
      if (moduleIds.length > 0) {
        // Find all lessons for these modules
        // Using multiple queries for simplicity given potential ORM limitations on 'in' without explicit setup
        for (const mId of moduleIds) {
            const modsLessons = await db.select().from(clarityLessons).where(eq(clarityLessons.moduleId, mId)).orderBy(asc(clarityLessons.orderIndex));
            lessons = lessons.concat(modsLessons);
        }
      }

      const completions = await db.select().from(clarityLessonCompletions).where(eq(clarityLessonCompletions.userId, ctx.auth.user.id));

      return { course, modules, lessons, completions };
    }),

  generateLessonContent: protectedProcedure
    .input(z.object({ lessonId: z.string(), regenerate: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const [lesson] = await db.select().from(clarityLessons).where(eq(clarityLessons.id, input.lessonId));
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND" });

      if (lesson.content && !input.regenerate) {
        try {
          const existing = JSON.parse(lesson.content);
          if (existing.questions && Array.isArray(existing.questions) && existing.questions.length >= 5) {
            return existing;
          }
        } catch {
          // Invalid cached JSON; regenerate below
        }
      }

      const [mod] = await db.select().from(clarityModules).where(eq(clarityModules.id, lesson.moduleId));
      const [course] = await db.select().from(clarityCourses).where(eq(clarityCourses.id, mod.courseId));

      const prompt = `Create interactive, in-depth lesson content for a lesson titled "${lesson.title}" in the module "${mod.title}" for a course about "${course.topic}".
Include 4-6 instructional slides and 6-10 comprehensive multiple choice questions.
Ensure questions test conceptual understanding, key terminology, practical application, and problem solving.
For each question, include a detailed explanation of why the correct option is right and what the key takeaway is.`;

      const responseSchema = {
        type: "object",
        properties: {
          slides: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" }
              },
              required: ["title", "content"]
            }
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" }
                },
                correctOptionIndex: { type: "integer" },
                explanation: { type: "string" }
              },
              required: ["question", "options", "correctOptionIndex", "explanation"]
            }
          }
        },
        required: ["slides", "questions"]
      };

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt + "\n\nReturn ONLY valid JSON matching this schema:\n" + JSON.stringify(responseSchema, null, 2) }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const contentStr = response.choices[0]?.message?.content || "{}";
        await db.update(clarityLessons).set({ content: contentStr }).where(eq(clarityLessons.id, lesson.id));
        return JSON.parse(contentStr);
      } catch (error) {
        console.error("Lesson Gen Error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate lesson content" });
      }
    }),

  completeLesson: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [lesson] = await db.select().from(clarityLessons).where(eq(clarityLessons.id, input.lessonId));
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND" });

      const [existing] = await db.select().from(clarityLessonCompletions).where(
        and(eq(clarityLessonCompletions.userId, ctx.auth.user.id), eq(clarityLessonCompletions.lessonId, input.lessonId))
      );

      let currentStreak = 0;
      if (!existing) {
        await db.insert(clarityLessonCompletions).values({
          userId: ctx.auth.user.id,
          lessonId: input.lessonId
        });

        // Add XP
        let [progress] = await db.select().from(clarityUserProgress).where(eq(clarityUserProgress.userId, ctx.auth.user.id));
        if (progress) {
          const now = new Date();
          let newStreak = progress.streakDays;
          if (progress.lastActiveAt) {
            const diffDays = Math.floor((now.getTime() - new Date(progress.lastActiveAt).getTime()) / (1000 * 3600 * 24));
            if (diffDays === 1) newStreak++;
            else if (diffDays > 1) newStreak = 1;
          } else {
            newStreak = 1;
          }

          currentStreak = newStreak;
          await db.update(clarityUserProgress).set({
            xp: progress.xp + lesson.xpReward,
            streakDays: newStreak,
            lastActiveAt: now
          }).where(eq(clarityUserProgress.id, progress.id));
        }
      } else {
        let [progress] = await db.select().from(clarityUserProgress).where(eq(clarityUserProgress.userId, ctx.auth.user.id));
        currentStreak = progress?.streakDays || 0;
      }
      return { success: true, streak: currentStreak };
    })
});
