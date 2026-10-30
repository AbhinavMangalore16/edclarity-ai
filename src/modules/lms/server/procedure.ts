import { createTRPCRouter, protectedProcedure, teacherProcedure, adminProcedure, baseProcedure } from '@/trpc/init';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { lmsCourses, lmsChapters, muxData, lmsProgress, lmsPurchases, categories, lmsAttachments, user, teacherEarnings } from '@/db/schema';
import { eq, and, asc, desc, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { video } from '@/lib/mux';
import { dodoClient } from '@/lib/dodo';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

const RBAC_KEY_SALT = process.env.RBAC_KEY_SALT || 'edclarity-rbac-v1-salt-9f8e7d6c';
const RBAC_ROLE_DIGESTS: Record<'teacher' | 'admin', string> = {
  teacher: process.env.TEACHER_ACCESS_HASH || 'abb43403d380b877dfacd1c372c918190dc8c9bc37857804ae081ef1f38ba201',
  admin: process.env.ADMIN_ACCESS_HASH || 'b792ed4d1c7c16d37ac61872b59156be8cf1d004d9b7c1327f7987e297191bcb',
};

function verifyRoleAccessPassword(role: 'teacher' | 'admin', password?: string): boolean {
  if (!password) return false;
  const derived = crypto.pbkdf2Sync(password.trim(), RBAC_KEY_SALT, 100000, 32, 'sha256');
  const expected = Buffer.from(RBAC_ROLE_DIGESTS[role], 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export const lmsRouter = createTRPCRouter({
  // =============================================================
  // 1. PUBLIC / STUDENT COURSE MARKETPLACE PROCEDURES
  // =============================================================

  getCategories: baseProcedure.query(async () => {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }),

  getTeacherEarnings: teacherProcedure.query(async ({ ctx }) => {
    const teacherId = ctx.auth.user.id;

    const earnings = await db.query.teacherEarnings.findMany({
      where: eq(teacherEarnings.teacherId, teacherId),
      with: {
        course: true,
      },
      orderBy: [desc(teacherEarnings.createdAt)],
    });

    let totalGross = 0;
    let totalPlatformFee = 0;
    let totalNet = 0;

    for (const item of earnings) {
      totalGross += item.grossAmount;
      totalPlatformFee += item.platformFee;
      totalNet += item.netAmount;
    }

    return {
      earnings,
      stats: {
        totalSales: earnings.length,
        totalGross,
        totalPlatformFee,
        totalNet,
      },
    };
  }),

  getCourses: baseProcedure
    .input(
      z.object({
        title: z.string().optional(),
        categoryId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const allCourses = await db.query.lmsCourses.findMany({
        where: (courses, { eq, and, ilike }) => {
          const conditions = [eq(courses.isPublished, true)];
          if (input?.categoryId) {
            conditions.push(eq(courses.categoryId, input.categoryId));
          }
          if (input?.title) {
            conditions.push(ilike(courses.title, `%${input.title}%`));
          }
          return and(...conditions);
        },
        with: {
          chapters: {
            where: (ch: any, { eq }: { eq: any }) => eq(ch.isPublished, true),
          },
        },
        orderBy: (courses, { desc }) => [desc(courses.createdAt)],
      });

      return allCourses;
    }),

  getCourseDetails: baseProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ input }) => {
      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, input.courseId),
        with: {
          chapters: {
            orderBy: asc(lmsChapters.position),
          },
          attachments: true,
        },
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      let isPurchased = false;
      try {
        const session = await auth.api.getSession({
          headers: await headers(),
        });
        if (session?.user?.id) {
          const purchase = await db.query.lmsPurchases.findFirst({
            where: and(
              eq(lmsPurchases.userId, session.user.id),
              eq(lmsPurchases.courseId, input.courseId)
            ),
          });
          if (purchase) isPurchased = true;
        }
      } catch (e) {
        // Unauthenticated public viewer
      }

      return {
        ...course,
        isPurchased,
      };
    }),

  // =============================================================
  // 2. TEACHER COURSE STUDIO PROCEDURES
  // =============================================================

  getTeacherCourses: teacherProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });
    const isAdmin = dbUser?.role === 'admin';

    return await db.query.lmsCourses.findMany({
      where: isAdmin ? undefined : eq(lmsCourses.userId, userId),
      with: {
        chapters: {
          orderBy: asc(lmsChapters.position),
        },
      },
      orderBy: desc(lmsCourses.createdAt),
    });
  }),

  createCourse: teacherProcedure
    .input(z.object({ title: z.string().min(1, "Title is required") }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;
      const [newCourse] = await db.insert(lmsCourses).values({
        title: input.title,
        description: "",
        userId,
      }).returning();

      return newCourse;
    }),

  updateCourse: teacherProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        price: z.number().optional(),
        isProOnly: z.boolean().optional(),
        isPublished: z.boolean().optional(),
        categoryId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { courseId, ...values } = input;

      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, courseId),
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      const [updated] = await db
        .update(lmsCourses)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(lmsCourses.id, courseId))
        .returning();

      return updated;
    }),

  deleteCourse: teacherProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ input }) => {
      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, input.courseId),
        with: {
          chapters: true,
        },
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      // Fetch and delete all Mux video assets associated with this course's chapters
      const chapterIds = course.chapters.map(c => c.id);
      if (chapterIds.length > 0) {
        const muxRecords = await db.query.muxData.findMany({
          where: inArray(muxData.chapterId, chapterIds),
        });

        for (const record of muxRecords) {
          if (record.assetId) {
            try {
              await video.assets.delete(record.assetId);
            } catch (e) {
              console.warn(`Could not delete Mux asset ${record.assetId}:`, e);
            }
          }
        }
      }

      // Delete course record in DB (cascades chapters, attachments, purchases, muxData)
      await db.delete(lmsCourses).where(eq(lmsCourses.id, input.courseId));
      return { success: true };
    }),

  deleteChapter: teacherProcedure
    .input(z.object({ chapterId: z.string(), courseId: z.string() }))
    .mutation(async ({ input }) => {
      const chapter = await db.query.lmsChapters.findFirst({
        where: eq(lmsChapters.id, input.chapterId),
      });

      if (!chapter) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chapter not found' });
      }

      const record = await db.query.muxData.findFirst({
        where: eq(muxData.chapterId, input.chapterId),
      });

      if (record?.assetId) {
        try {
          await video.assets.delete(record.assetId);
        } catch (e) {
          console.warn(`Could not delete Mux asset ${record.assetId}:`, e);
        }
      }

      await db.delete(lmsChapters).where(eq(lmsChapters.id, input.chapterId));
      return { success: true };
    }),

  // =============================================================
  // 3. CHAPTER MANAGEMENT & MUX VIDEO
  // =============================================================

  createChapter: teacherProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      const lastChapter = await db.query.lmsChapters.findFirst({
        where: eq(lmsChapters.courseId, input.courseId),
        orderBy: desc(lmsChapters.position),
      });

      const newPosition = lastChapter ? lastChapter.position + 1 : 1;

      const [chapter] = await db
        .insert(lmsChapters)
        .values({
          title: input.title,
          courseId: input.courseId,
          position: newPosition,
          isPublished: true,
        })
        .returning();

      return chapter;
    }),

  reorderChapters: teacherProcedure
    .input(
      z.object({
        courseId: z.string(),
        list: z.array(
          z.object({
            id: z.string(),
            position: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      for (const item of input.list) {
        await db
          .update(lmsChapters)
          .set({ position: item.position })
          .where(eq(lmsChapters.id, item.id));
      }

      return { success: true };
    }),

  updateChapter: teacherProcedure
    .input(
      z.object({
        chapterId: z.string(),
        courseId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        videoUrl: z.string().optional(),
        isFree: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      const { chapterId, courseId, ...values } = input;
      const [updatedChapter] = await db
        .update(lmsChapters)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(lmsChapters.id, chapterId))
        .returning();

      return updatedChapter;
    }),

  createMuxDirectUpload: teacherProcedure
    .input(z.object({ chapterId: z.string(), courseId: z.string() }))
    .mutation(async ({ input }) => {
      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      // Check existing Mux Data
      const existingMux = await db.query.muxData.findFirst({
        where: eq(muxData.chapterId, input.chapterId),
      });

      if (existingMux?.assetId) {
        try {
          await video.assets.delete(existingMux.assetId);
        } catch (e) {
          console.warn("Could not delete old Mux asset:", e);
        }
        await db.delete(muxData).where(eq(muxData.chapterId, input.chapterId));
      }

      // Create Mux Direct Upload
      const upload = await video.uploads.create({
        new_asset_settings: {
          playback_policy: ['public'],
          passthrough: input.chapterId,
        },
        cors_origin: '*',
      });

      return { uploadUrl: upload.url, uploadId: upload.id };
    }),

  syncMuxUpload: teacherProcedure
    .input(z.object({ uploadId: z.string(), chapterId: z.string(), courseId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const upload = await video.uploads.retrieve(input.uploadId);
        if (upload.asset_id) {
          const asset = await video.assets.retrieve(upload.asset_id);
          const playbackId = asset.playback_ids?.[0]?.id;
          if (playbackId) {
            const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;

            const existingMux = await db.query.muxData.findFirst({
              where: eq(muxData.chapterId, input.chapterId),
            });

            if (existingMux) {
              await db.update(muxData)
                .set({ assetId: upload.asset_id, playbackId })
                .where(eq(muxData.id, existingMux.id));
            } else {
              await db.insert(muxData).values({
                chapterId: input.chapterId,
                assetId: upload.asset_id,
                playbackId,
              });
            }

            await db.update(lmsChapters)
              .set({ videoUrl })
              .where(eq(lmsChapters.id, input.chapterId));

            return { videoUrl, playbackId, status: 'ready' };
          }
        }
        return { status: upload.status };
      } catch (e: any) {
        console.error("Failed to sync Mux upload:", e);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message || 'Mux sync failed' });
      }
    }),

  // =============================================================
  // 4. STUDENT PROGRESS & CHECKOUT (DODO PAYMENTS)
  // =============================================================

  toggleProgress: protectedProcedure
    .input(z.object({ chapterId: z.string(), isCompleted: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      const existingProgress = await db.query.lmsProgress.findFirst({
        where: and(eq(lmsProgress.userId, userId), eq(lmsProgress.chapterId, input.chapterId)),
      });

      if (existingProgress) {
        return await db
          .update(lmsProgress)
          .set({ isCompleted: input.isCompleted, completedAt: input.isCompleted ? new Date() : null })
          .where(eq(lmsProgress.id, existingProgress.id))
          .returning();
      }

      return await db
        .insert(lmsProgress)
        .values({
          userId,
          chapterId: input.chapterId,
          isCompleted: input.isCompleted,
          completedAt: input.isCompleted ? new Date() : null,
        })
        .returning();
    }),

  createDodoCheckoutSession: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;
      const userEmail = ctx.auth.user.email;

      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, input.courseId),
      });

      if (!course) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Course not found' });
      }

      // If course is free, grant immediate access
      if (!course.price || course.price === 0) {
        await db.insert(lmsPurchases).values({
          userId,
          courseId: course.id,
          dodoPaymentId: `free_${nanoid()}`,
          amountPaid: 0,
        }).onConflictDoNothing();
        return { checkoutUrl: `/learn/${course.id}` };
      }

      const baseUrl = process.env.DODO_PAYMENTS_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`;
      const returnUrl = baseUrl.includes('?') ? `${baseUrl}&course_id=${course.id}` : `${baseUrl}?course_id=${course.id}`;

      try {
        let productIdToUse = process.env.DODO_PAYMENTS_PRODUCT_ID;

        if (!productIdToUse) {
          // Attempt to create a dynamic product on Dodo Payments
          try {
            const newProduct = await dodoClient.products.create({
              name: course.title,
              price: {
                currency: 'INR',
                price: course.price,
                type: 'one_time_price',
              },
              tax_category: 'digital_products',
            });
            if (newProduct?.product_id) {
              productIdToUse = newProduct.product_id;
            }
          } catch (pErr: any) {
            console.warn('[DODO PRODUCTS CREATE WARN]:', pErr?.message || pErr);
          }
        }

        // Fallback to course.id if no product ID returned
        if (!productIdToUse) {
          productIdToUse = course.id;
        }

        const session = await dodoClient.checkoutSessions.create({
          product_cart: [
            {
              product_id: productIdToUse,
              quantity: 1,
            },
          ],
          customer: {
            email: userEmail,
          },
          return_url: returnUrl,
          metadata: {
            userId,
            courseId: course.id,
            type: 'course_purchase',
          },
        });

        if (session?.checkout_url) {
          return { checkoutUrl: session.checkout_url };
        }
      } catch (err: any) {
        console.warn('[DODO CHECKOUT FALLBACK]: Dodo Checkout creation failed:', err?.message || err);
      }

      // Direct auto-enrollment + teacher earnings split for dev/test accounts when Dodo Checkout isn't used
      const [purchase] = await db
        .insert(lmsPurchases)
        .values({
          userId,
          courseId: course.id,
          dodoPaymentId: `dev_${nanoid()}`,
          amountPaid: course.price || 0,
        })
        .onConflictDoNothing()
        .returning();

      if (course.userId) {
        const grossAmount = course.price || 0;
        const platformFee = Math.round(grossAmount * 0.15);
        const netAmount = grossAmount - platformFee;

        await db
          .insert(teacherEarnings)
          .values({
            teacherId: course.userId,
            courseId: course.id,
            purchaseId: purchase?.id || null,
            grossAmount,
            platformFee,
            netAmount,
            status: 'cleared',
          })
          .onConflictDoNothing();
      }

      return { checkoutUrl: `/learn/${course.id}?purchased=1` };
    }),

  createProCheckoutSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.auth.user.id;
      const userEmail = ctx.auth.user.email;

      const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL}/courses?pro=1`;

      try {
        let productIdToUse = process.env.DODO_PAYMENTS_PRO_PLAN_ID;

        if (!productIdToUse) {
          try {
            const newProduct = await dodoClient.products.create({
              name: 'EdClarity Pro Monthly Subscription',
              price: {
                currency: 'INR',
                price: 49900,
                type: 'one_time_price',
              },
              tax_category: 'digital_products',
            });
            if (newProduct?.product_id) {
              productIdToUse = newProduct.product_id;
            }
          } catch (pErr: any) {
            console.warn('[DODO PRO PRODUCT CREATE WARN]:', pErr?.message || pErr);
          }
        }

        if (productIdToUse) {
          const session = await dodoClient.checkoutSessions.create({
            product_cart: [
              {
                product_id: productIdToUse,
                quantity: 1,
              },
            ],
            customer: {
              email: userEmail,
            },
            return_url: returnUrl,
            metadata: {
              userId,
              type: 'pro_subscription',
            },
          });

          if (session?.checkout_url) {
            return { checkoutUrl: session.checkout_url, isProUpgraded: false };
          }
        }
      } catch (err: any) {
        console.warn('[DODO PRO CHECKOUT FALLBACK]:', err?.message || err);
      }

      // Dev / Test mode fallback auto-upgrade
      await db.update(user).set({ isPro: true }).where(eq(user.id, userId));
      return { checkoutUrl: '/courses?pro_success=1', isProUpgraded: true };
    }),

  claimPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string().optional(),
        courseId: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      if (input.courseId) {
        const [purchase] = await db
          .insert(lmsPurchases)
          .values({
            userId,
            courseId: input.courseId,
            dodoPaymentId: input.paymentId || `pay_${nanoid()}`,
            amountPaid: 0,
          })
          .onConflictDoNothing()
          .returning();

        // Calculate and record Teacher Revenue Split (85% Teacher / 15% Platform)
        const course = await db.query.lmsCourses.findFirst({
          where: eq(lmsCourses.id, input.courseId),
        });

        if (course?.userId) {
          const grossAmount = course.price || 0;
          const platformFee = Math.round(grossAmount * 0.15);
          const netAmount = grossAmount - platformFee;

          const { teacherEarnings } = await import('@/db/schema');
          await db.insert(teacherEarnings).values({
            teacherId: course.userId,
            courseId: course.id,
            purchaseId: purchase?.id || null,
            grossAmount,
            platformFee,
            netAmount,
            status: 'cleared',
          }).onConflictDoNothing();
        }

        return { success: true, redirectUrl: `/learn/${input.courseId}` };
      }

      if (input.status === 'succeeded' || input.paymentId) {
        await db.update(user).set({ isPro: true }).where(eq(user.id, userId));
        return { success: true, redirectUrl: '/courses?pro=1' };
      }

      return { success: true, redirectUrl: '/courses' };
    }),

  setUserRole: protectedProcedure
    .input(
      z.object({
        role: z.enum(["student", "teacher", "admin", "mentor"]),
        accessPassword: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      if (input.role === "teacher" || input.role === "admin") {
        const isValid = verifyRoleAccessPassword(input.role, input.accessPassword);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `Invalid ${input.role === "admin" ? "SuperAdmin" : "Teacher"} access password.`,
          });
        }
      }

      const [updated] = await db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, userId))
        .returning();
      return updated;
    }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, ctx.auth.user.id),
    });
    return dbUser;
  }),
});


