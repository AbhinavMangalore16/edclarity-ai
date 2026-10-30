import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import { lmsCourses, user, lmsPurchases } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateFastCompletion } from "@/lib/groq";
import { checkInputGuardrail } from "@/lib/guardrails";
import { nanoid } from "nanoid";

export interface PersonaMessage {
  id: string;
  courseId: string;
  channelId: string;
  senderName: string;
  senderRole: "teacher" | "student" | "ai_notetaker";
  senderAvatar?: string;
  content: string;
  createdAt: string;
  isAiResponse?: boolean;
}

// In-memory persistent channel message store for active class discussion forums
const inMemoryMessages: Record<string, PersonaMessage[]> = {};

function getChannelKey(courseId: string, channelId: string) {
  return `${courseId}:${channelId}`;
}

async function verifyCourseAccess(userId: string, userRole?: string | null, isPro?: boolean | null, courseId?: string) {
  if (userRole === "teacher" || userRole === "admin" || Boolean(isPro)) return true;
  if (!courseId) return false;
  const purchase = await db.query.lmsPurchases.findFirst({
    where: and(
      eq(lmsPurchases.userId, userId),
      eq(lmsPurchases.courseId, courseId)
    ),
  });
  if (purchase) return true;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You must be enrolled in this course or have a Pro subscription to access this class forum.",
  });
}

export const personaRouter = createTRPCRouter({
  getCourseForums: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const userRole = ctx.auth.user.role;
    const isPro = ctx.auth.user.isPro;

    let courses: any[] = [];
    if (userRole === "teacher" || userRole === "admin" || isPro) {
      courses = await db.query.lmsCourses.findMany({
        where: eq(lmsCourses.isPublished, true),
        orderBy: [desc(lmsCourses.createdAt)],
      });
    } else {
      // Students see forums ONLY for courses they have purchased
      const purchases = await db.select().from(lmsPurchases).where(eq(lmsPurchases.userId, userId));
      const courseIds = purchases.map((p) => p.courseId);

      if (courseIds.length > 0) {
        courses = await db.query.lmsCourses.findMany({
          where: and(
            eq(lmsCourses.isPublished, true),
            inArray(lmsCourses.id, courseIds)
          ),
          orderBy: [desc(lmsCourses.createdAt)],
        });
      }
    }

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description || "Class discussion forum with AI Notetaker Persona.",
      imageUrl: c.imageUrl,
      channels: [
        { id: "general-discussion", name: "general-discussion", type: "text", description: "Open class discussion for teachers and students" },
        { id: "ai-notetaker-summary", name: "ai-notetaker-summary", type: "announcement", description: "Automated AI class summaries, takeaways & study guides" },
        { id: "live-q-and-a", name: "live-q-and-a", type: "qna", description: "Ask questions and get instant AI Co-Teacher answers" },
        { id: "homework-and-resources", name: "homework-and-resources", type: "resources", description: "Class materials, assignments & code snippets" },
      ],
    }));
  }),

  getChannelMessages: protectedProcedure
    .input(z.object({ courseId: z.string(), channelId: z.string() }))
    .query(async ({ input, ctx }) => {
      await verifyCourseAccess(ctx.auth.user.id, ctx.auth.user.role, ctx.auth.user.isPro, input.courseId);

      const key = getChannelKey(input.courseId, input.channelId);

      if (!inMemoryMessages[key] || inMemoryMessages[key].length === 0) {
        // Seed default welcome & AI Notetaker intro messages for new class channels
        if (input.channelId === "ai-notetaker-summary") {
          inMemoryMessages[key] = [
            {
              id: `seed_${nanoid()}`,
              courseId: input.courseId,
              channelId: input.channelId,
              senderName: "AI Notetaker Persona",
              senderRole: "ai_notetaker",
              senderAvatar: "/logo.png",
              content: "👋 Welcome to the **#ai-notetaker-summary** channel! I automatically capture lesson key points, formula breakdowns, and student summaries for this class using sub-50ms Athena-EdC-v1 inference.",
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              isAiResponse: true,
            },
          ];
        } else if (input.channelId === "live-q-and-a") {
          inMemoryMessages[key] = [
            {
              id: `seed_${nanoid()}`,
              courseId: input.courseId,
              channelId: input.channelId,
              senderName: "AI Co-Teacher Persona",
              senderRole: "ai_notetaker",
              senderAvatar: "/logo.png",
              content: "❓ Ask any question about this class here! Mention `@AI` or post your doubt to get an instant answer with guardrail safety verification.",
              createdAt: new Date(Date.now() - 1800000).toISOString(),
              isAiResponse: true,
            },
          ];
        } else {
          inMemoryMessages[key] = [
            {
              id: `seed_${nanoid()}`,
              courseId: input.courseId,
              channelId: input.channelId,
              senderName: "Instructor",
              senderRole: "teacher",
              senderAvatar: "",
              content: `Welcome everyone to the #${input.channelId} channel for this class! Feel free to ask questions, share notes, and collaborate.`,
              createdAt: new Date(Date.now() - 7200000).toISOString(),
            },
          ];
        }
      }

      return inMemoryMessages[key];
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        channelId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;
      const userName = ctx.auth.user.name || "User";
      const dbUser = await db.query.user.findFirst({ where: eq(user.id, userId) });
      const userRole = (dbUser?.role as "teacher" | "student") || "student";

      await verifyCourseAccess(userId, userRole, ctx.auth.user.isPro, input.courseId);

      const key = getChannelKey(input.courseId, input.channelId);
      if (!inMemoryMessages[key]) {
        inMemoryMessages[key] = [];
      }

      // Fast Linguistic Guardrail verification
      const guardrail = await checkInputGuardrail(input.content);
      if (!guardrail.isSafe) {
        throw new Error(`Guardrail Policy Alert: ${guardrail.flaggedReason || "Message content violates safety policy."}`);
      }

      const userMsg: PersonaMessage = {
        id: `msg_${nanoid()}`,
        courseId: input.courseId,
        channelId: input.channelId,
        senderName: userName,
        senderRole: userRole,
        senderAvatar: ctx.auth.user.image || "",
        content: input.content,
        createdAt: new Date().toISOString(),
      };

      inMemoryMessages[key].push(userMsg);

      // Trigger AI Notetaker Persona response if channel is Q&A, AI Summary, or if message contains @AI / doubt
      const isAiTriggered =
        input.channelId === "live-q-and-a" ||
        input.channelId === "ai-notetaker-summary" ||
        input.content.toLowerCase().includes("@ai") ||
        input.content.toLowerCase().includes("note") ||
        input.content.toLowerCase().includes("explain");

      if (isAiTriggered) {
        const course = await db.query.lmsCourses.findFirst({ where: eq(lmsCourses.id, input.courseId) });
        const courseTitle = course?.title || "this class";

        const systemPrompt = `You are the AI Notetaker & Co-Teacher Persona for the class "${courseTitle}".
Channel: #${input.channelId}.
Your tone is encouraging, authoritative, and concise. Provide crisp, high-accuracy responses for students and teachers.`;

        const startTime = Date.now();
        const aiReplyContent = await generateFastCompletion(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.content },
          ],
          "llama-3.3-70b-versatile"
        );
        const latencyMs = Date.now() - startTime;

        try {
          const { recordAiTrace } = await import('@/lib/telemetry');
          await recordAiTrace({
            userId,
            feature: "persona_qna",
            model: "Athena-EdC-v1",
            promptSnippet: input.content,
            responseSnippet: aiReplyContent,
            latencyMs,
            guardrailPassed: true,
            status: "success",
          });
        } catch (tErr) {
          console.warn("Telemetry record warning:", tErr);
        }

        const aiMsg: PersonaMessage = {
          id: `msg_ai_${nanoid()}`,
          courseId: input.courseId,
          channelId: input.channelId,
          senderName: "AI Notetaker Persona",
          senderRole: "ai_notetaker",
          senderAvatar: "/logo.png",
          content: aiReplyContent,
          createdAt: new Date().toISOString(),
          isAiResponse: true,
        };

        inMemoryMessages[key].push(aiMsg);
      }

      return userMsg;
    }),

  generateAiClassNotes: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await verifyCourseAccess(ctx.auth.user.id, ctx.auth.user.role, ctx.auth.user.isPro, input.courseId);

      const course = await db.query.lmsCourses.findFirst({ where: eq(lmsCourses.id, input.courseId) });
      const courseTitle = course?.title || "this class";

      const prompt = `Generate a structured, high-yield study note summary for the course "${courseTitle}".
Include:
1. Core Concepts & Definitions
2. Key Takeaways
3. Recommended Practice Exercises`;

      const summaryText = await generateFastCompletion(
        [{ role: "system", content: "You are the AI Notetaker Persona generating structured class study guides." }, { role: "user", content: prompt }],
        "llama-3.3-70b-versatile"
      );

      const key = getChannelKey(input.courseId, "ai-notetaker-summary");
      if (!inMemoryMessages[key]) {
        inMemoryMessages[key] = [];
      }

      const noteMsg: PersonaMessage = {
        id: `msg_note_${nanoid()}`,
        courseId: input.courseId,
        channelId: "ai-notetaker-summary",
        senderName: "AI Notetaker Persona",
        senderRole: "ai_notetaker",
        senderAvatar: "/logo.png",
        content: summaryText,
        createdAt: new Date().toISOString(),
        isAiResponse: true,
      };

      inMemoryMessages[key].push(noteMsg);
      return noteMsg;
    }),
});
