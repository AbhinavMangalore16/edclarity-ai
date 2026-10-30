import { db } from "@/db";
import { agents, meetings, liveClassEnrollments, user, lmsPurchases } from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure, teacherProcedure } from "@/trpc/init";
import { and, count, desc, eq, getTableColumns, ilike, sql, ne, inArray } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { DEFAULT_PAGE, DEFAULT_PAGESIZE, MAX_PAGESIZE, MIN_PAGESIZE } from "@/constants";
import { meetingSchema, meetingUpdationSchema } from "../schemas";
import { MeetingStatus } from "../types";
import { streamComms } from "@/lib/comms";
import { genAvatarURI } from "@/lib/avatargen";

export const meetingRouter = createTRPCRouter({
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamComms.upsertUsers([{
      id: ctx.auth.user.id,
      name: ctx.auth.user.name,
      role: "admin",
      image: ctx.auth.user.image ?? genAvatarURI({ seed: ctx.auth.user.name, variant: "initials" })
    }
    ])
    const now = Math.floor(Date.now() / 1000);
    const expToken = now + 3600; // 1 hour expiry
    const userToken = streamComms.generateUserToken({
      user_id: ctx.auth.user.id,
      iat: now,
      exp: expToken,
    })
    return userToken;
  }),

  // Only Teachers and Admins can initiate/create live meetings
  create: teacherProcedure
    .input(meetingSchema)
    .mutation(async ({ input, ctx }) => {
      // Free Tier Rate Limiting Check
      const [meetingCount] = await db.select({ count: count() })
          .from(meetings)
          .where(
              and(
                  eq(meetings.agentId, input.agentId),
                  ne(meetings.status, "cancelled"),
                  sql`${meetings.createdAt} >= NOW() - INTERVAL '14 days'`
              )
          );

      if (meetingCount.count >= 3) {
          throw new TRPCError({ code: "FORBIDDEN", message: "LIMIT_MEETINGS" });
      }

      const [createdMeeting] = await db.insert(meetings)
        .values({
          ...input,
          userId: ctx.auth.user.id,
        }).returning();

      try {
        const meeting = streamComms.video.call("default", createdMeeting.id);
        await meeting.create({
          data: {
            created_by_id: ctx.auth.user.id,
            custom: {
              meetingId: createdMeeting.id,
              meetingName: createdMeeting.name
            },
            settings_override: {
              transcription: {
                language: "en",
                mode: "auto-on",
                closed_caption_mode: "auto-on"
              },
              recording: {
                mode: "auto-on",
                quality: "1080p"
              }
            }
          }
        });

        const [agent] = await db.select()
          .from(agents).where(eq(agents.id, createdMeeting.agentId));

        if (agent) {
          await streamComms.upsertUsers([
            {
              id: agent.id,
              name: agent.name,
              role: "user",
              image: "https://api.dicebear.com/9.x/bottts/webp"
            }
          ]);
        }
      } catch (streamErr) {
        console.warn("createMeeting: Stream API initialization warning:", streamErr);
      }

      return createdMeeting;
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const durationExpr = sql<number>`
                CASE 
                    WHEN ${meetings.endAt} IS NOT NULL AND ${meetings.startAt} IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (${meetings.endAt} - ${meetings.startAt})) 
                    ELSE NULL 
                END
                `.as("duration");
      const [selectMeeting] = await db.select({ ...getTableColumns(meetings), agent: agents, duration: durationExpr })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          eq(meetings.id, input.id)
        );
      if (!selectMeeting) { throw new TRPCError({ code: "NOT_FOUND", message: "Meeting NOT FOUND" }); }
      return selectMeeting;
    }),

  getMany: protectedProcedure
    .input(z.object({
      page: z.number().default(DEFAULT_PAGE),
      pageSize: z.number().min(MIN_PAGESIZE).max(MAX_PAGESIZE).default(DEFAULT_PAGESIZE),
      search: z.string().nullish(),
      agentId: z.string().nullish(),
      status: z.enum([MeetingStatus.Scheduled, MeetingStatus.Active, MeetingStatus.Processing, MeetingStatus.Completed, MeetingStatus.Cancelled]).nullish(),
    }))
    .query(async ({ input, ctx }) => {
      const { page, pageSize, search, status, agentId } = input;
      const userId = ctx.auth.user.id;
      const isTeacher = ctx.auth.user.role === "teacher";
      const isAdmin = ctx.auth.user.role === "admin";
      const isProUser = ctx.auth.user.isPro;

      // Course purchases for student meeting visibility
      const userPurchases = await db.select().from(lmsPurchases).where(eq(lmsPurchases.userId, userId));
      const purchasedCourseIds = userPurchases.map((p) => p.courseId);

      let accessCondition;
      if (isAdmin) {
        accessCondition = undefined;
      } else if (isTeacher) {
        accessCondition = eq(meetings.userId, userId);
      } else if (isProUser) {
        accessCondition = undefined;
      } else {
        if (purchasedCourseIds.length > 0) {
          accessCondition = inArray(meetings.courseId, purchasedCourseIds);
        } else {
          accessCondition = eq(meetings.userId, userId);
        }
      }

      const durationExpr = sql<number>`
                CASE 
                    WHEN ${meetings.endAt} IS NOT NULL AND ${meetings.startAt} IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (${meetings.endAt} - ${meetings.startAt})) 
                    ELSE NULL 
                END
                `.as("duration");

      const data = await db.select({ ...getTableColumns(meetings), agent: agents, duration: durationExpr })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            accessCondition,
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined,
          )
        )
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [total] = await db.select({ count: count() })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            accessCondition,
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined,
          )
        );

      const userEnrollments = await db.select().from(liveClassEnrollments).where(eq(liveClassEnrollments.userId, userId));
      const enrollmentMap = new Map(userEnrollments.map((e) => [e.meetingId, e.status]));
      const purchasedCourseSet = new Set(purchasedCourseIds);

      const enrichedData = data.map((m) => {
        let enrollmentStatus = "not_enrolled";
        if (m.userId === userId || isTeacher || isAdmin || isProUser) {
          enrollmentStatus = "approved";
        } else if (m.courseId && purchasedCourseSet.has(m.courseId)) {
          enrollmentStatus = "approved";
        } else if (!m.courseId) {
          enrollmentStatus = "approved";
        } else {
          enrollmentStatus = enrollmentMap.get(m.id) || "not_enrolled";
        }
        return {
          ...m,
          userEnrollmentStatus: enrollmentStatus,
        };
      });

      const totalCount = Math.ceil((total?.count || 0) / pageSize);
      return { data: enrichedData, total: total?.count || 0, totalCount };
    }),

  requestAccess: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;
      const [enrollment] = await db.insert(liveClassEnrollments)
        .values({
          meetingId: input.meetingId,
          userId,
          status: "pending",
        })
        .onConflictDoNothing()
        .returning();

      return enrollment || { meetingId: input.meetingId, userId, status: "pending" };
    }),

  getPendingRequests: protectedProcedure
    .query(async ({ ctx }) => {
      const requests = await db.select({
        id: liveClassEnrollments.id,
        meetingId: liveClassEnrollments.meetingId,
        meetingName: meetings.name,
        userId: liveClassEnrollments.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        status: liveClassEnrollments.status,
        createdAt: liveClassEnrollments.createdAt,
      })
        .from(liveClassEnrollments)
        .innerJoin(meetings, eq(liveClassEnrollments.meetingId, meetings.id))
        .innerJoin(user, eq(liveClassEnrollments.userId, user.id))
        .where(eq(liveClassEnrollments.status, "pending"))
        .orderBy(desc(liveClassEnrollments.createdAt));

      return requests;
    }),

  approveStudent: protectedProcedure
    .input(z.object({ enrollmentId: z.string(), status: z.enum(["approved", "rejected"]) }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(liveClassEnrollments)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(liveClassEnrollments.id, input.enrollmentId))
        .returning();

      return updated;
    }),

  update: protectedProcedure
    .input(meetingUpdationSchema).mutation(
      async ({ input, ctx }) => {
        const [updateMeeting] = await db.update(meetings)
          .set(input)
          .where(
            and(
              eq(meetings.id, input.id),
              eq(meetings.userId, ctx.auth.user.id),
            )
          )
          .returning();
        if (!updateMeeting) { throw new TRPCError({ code: "NOT_FOUND", message: "Meeting NOT FOUND" }); }
      }
    ),

  // Ending / Deleting a meeting is restricted to the Host Teacher or Admin
  remove: protectedProcedure
    .input(z.object({ id: z.string() })).mutation(
      async ({ input, ctx }) => {
        const meeting = await db.query.meetings.findFirst({
          where: eq(meetings.id, input.id),
        });

        if (!meeting) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meeting NOT FOUND" });
        }

        const isHost = meeting.userId === ctx.auth.user.id;
        const isAdmin = ctx.auth.user.role === "admin";

        if (!isHost && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the host teacher who initiated this meeting or an admin can end or delete it.",
          });
        }

        const [removeMeeting] = await db.delete(meetings)
          .where(eq(meetings.id, input.id))
          .returning();

        return removeMeeting;
      }
    )
});