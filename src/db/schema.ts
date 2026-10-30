import { pgTable, text, timestamp, boolean, serial, varchar, pgEnum, integer, real, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from 'nanoid';

export const userRoleEnum = pgEnum("user_role", ["admin", "teacher", "mentor", "student"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "past_due", "expired", "paused"]);

export const user = pgTable("user", {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
  image: text('image'),
  securityQuestion: text('security_question'),
  securityAnswer: text('security_answer'),
  resetOtpCode: text('reset_otp_code'),
  resetOtpExpires: timestamp('reset_otp_expires'),
  role: userRoleEnum('role').notNull().default("student"),
  isPro: boolean('is_pro').notNull().default(false),
  aiCredits: integer('ai_credits').notNull().default(50),
  streakShields: integer('streak_shields').notNull().default(0),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});

export const session = pgTable("session", {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const notifyPeople = pgTable("notify_people", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agents = pgTable("agents", {
  id: text("id").primaryKey().$defaultFn(()=> nanoid()),
  name: text("name").notNull(),
  instructions: text("instructions").notNull(),
  metadata: text("metadata"),
  userId: text("user_id").notNull().references(()=>user.id, {onDelete: "cascade"}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
})

export const meetingStatus = pgEnum("meeting_status", ["active", "completed", "processing", "scheduled", "cancelled"]);

export const meetings = pgTable("meetings", {
  id: text("id").primaryKey().$defaultFn(()=>nanoid()),
  name: text("name").notNull(),
  topic: text("topic"),
  courseId: text("course_id").references(() => lmsCourses.id, { onDelete: "set null" }),
  userId: text("user_id").notNull().references(()=>user.id, {onDelete: "cascade"}),
  agentId: text("agent_id").notNull().references(()=>agents.id, {onDelete: "cascade"}),
  status: meetingStatus("status").notNull().default("scheduled"),
  startAt: timestamp("start_at").notNull().defaultNow(),
  endAt: timestamp("end_at").notNull().defaultNow(),
  transcriptURL: text("transcript_url"),
  transcript: text("transcript"),
  recordingURL: text("recording_url"),
  summary: text("summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Dummy tables to satisfy unused legacy Next.js backend files
export const documents = pgTable("documents", { 
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  url: text("url").notNull(),
  key: text("key").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const documentChunks = pgTable("document_chunks", {
  id: text("id"),
  content: text("content"),
  type: text("type"),
  documentStructure: text("document_structure"),
  embedding: text("embedding"),
  userId: text("user_id"),
});
export const memoryItems = pgTable("memory_items", {
  id: text("id"),
  userId: text("user_id"),
  lastAccessed: timestamp("last_accessed"),
  concept: text("concept"),
  errorPattern: text("error_pattern"),
  confidenceLevel: text("confidence_level"),
});
export const messages = pgTable("messages", {
  id: text("id"),
  sessionId: text("session_id"),
  role: text("role"),
  content: text("content"),
  createdAt: timestamp("created_at"),
});

// Clarities - Gamified Learning Feature
export const clarityCourses = pgTable("clarity_courses", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  topic: text("topic").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clarityModules = pgTable("clarity_modules", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  courseId: text("course_id").notNull().references(() => clarityCourses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const clarityLessons = pgTable("clarity_lessons", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  moduleId: text("module_id").notNull().references(() => clarityModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"), // JSON string containing slides and quizzes
  orderIndex: integer("order_index").notNull(),
  xpReward: integer("xp_reward").notNull(),
});

export const clarityUserProgress = pgTable("clarity_user_progress", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  xp: integer("xp").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveAt: timestamp("last_active_at"),
});

export const clarityLessonCompletions = pgTable("clarity_lesson_completions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => clarityLessons.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

// Feature 1: Daily AI Quizzes
export const dailyQuizzes = pgTable("daily_quizzes", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  questions: text("questions").notNull(), // JSON array of 5 questions
  score: integer("score").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Feature 3: Flashcards from Meetings & Clarities
export const flashcards = pgTable("flashcards", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  meetingId: text("meeting_id"),
  topic: text("topic").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  easeFactor: text("ease_factor").notNull().default("2.5"),
  interval: integer("interval").notNull().default(1),
  repetitions: integer("repetitions").notNull().default(0),
  dueDate: timestamp("due_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Feature 4: Spaced Repetition Mastery Tracking
export const spacedRepetitionReviews = pgTable("spaced_repetition_reviews", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id"),
  topic: text("topic").notNull(),
  easeFactor: text("ease_factor").notNull().default("2.5"),
  interval: integer("interval").notNull().default(1),
  repetitions: integer("repetitions").notNull().default(0),
  dueDate: timestamp("due_date").notNull().defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at").notNull().defaultNow(),
});

// =============================================================
// LMS PLATFORM & NEXT-GEN EDCLARITY SUITE TABLES
// =============================================================

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lmsCourses = pgTable("lms_courses", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: integer("price").default(0), // Price in paise (e.g., 149900 = ₹1,499)
  isProOnly: boolean("is_pro_only").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lmsChapters = pgTable("lms_chapters", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  courseId: text("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  transcript: text("transcript"),
  position: integer("position").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  isFree: boolean("is_free").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lmsAttachments = pgTable("lms_attachments", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  url: text("url").notNull(),
  courseId: text("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const muxData = pgTable("mux_data", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  chapterId: text("chapter_id").notNull().references(() => lmsChapters.id, { onDelete: "cascade" }).unique(),
  assetId: text("asset_id").notNull(),
  playbackId: text("playback_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lmsProgress = pgTable("lms_progress", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").notNull().references(() => lmsChapters.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").notNull().default(false),
  lastWatchedSecond: integer("last_watched_second").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lmsPurchases = pgTable("lms_purchases", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  dodoPaymentId: text("dodo_payment_id").notNull().unique(),
  amountPaid: integer("amount_paid").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  dodoSubscriptionId: text("dodo_subscription_id").notNull().unique(),
  dodoCustomerId: text("dodo_customer_id").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  planId: text("plan_id").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lmsCertificates = pgTable("lms_certificates", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  certificateCode: text("certificate_code").notNull().unique(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});

export const teacherEarnings = pgTable("teacher_earnings", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  teacherId: text("teacher_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => lmsCourses.id, { onDelete: "cascade" }),
  purchaseId: text("purchase_id").references(() => lmsPurchases.id, { onDelete: "set null" }),
  grossAmount: integer("gross_amount").notNull(),
  platformFee: integer("platform_fee").notNull(),
  netAmount: integer("net_amount").notNull(),
  status: text("status").notNull().default("cleared"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lmsCoursesRelations = relations(lmsCourses, ({ many }) => ({
  chapters: many(lmsChapters),
  attachments: many(lmsAttachments),
}));

export const lmsChaptersRelations = relations(lmsChapters, ({ one, many }) => ({
  course: one(lmsCourses, {
    fields: [lmsChapters.courseId],
    references: [lmsCourses.id],
  }),
  muxData: one(muxData, {
    fields: [lmsChapters.id],
    references: [muxData.chapterId],
  }),
  userProgress: many(lmsProgress),
}));

export const lmsAttachmentsRelations = relations(lmsAttachments, ({ one }) => ({
  course: one(lmsCourses, {
    fields: [lmsAttachments.courseId],
    references: [lmsCourses.id],
  }),
}));

export const teacherEarningsRelations = relations(teacherEarnings, ({ one }) => ({
  course: one(lmsCourses, {
    fields: [teacherEarnings.courseId],
    references: [lmsCourses.id],
  }),
  teacher: one(user, {
    fields: [teacherEarnings.teacherId],
    references: [user.id],
  }),
}));

export const liveClassEnrollmentStatus = pgEnum("live_class_enrollment_status", ["pending", "approved", "rejected"]);

export const liveClassEnrollments = pgTable("live_class_enrollments", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  meetingId: text("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: liveClassEnrollmentStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  agent: one(agents, {
    fields: [meetings.agentId],
    references: [agents.id],
  }),
  course: one(lmsCourses, {
    fields: [meetings.courseId],
    references: [lmsCourses.id],
  }),
  enrollments: many(liveClassEnrollments),
}));

export const aiTraces = pgTable("ai_traces", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  feature: text("feature").notNull(),
  model: text("model").notNull(),
  promptSnippet: text("prompt_snippet").notNull(),
  responseSnippet: text("response_snippet"),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  latencyMs: integer("latency_ms").notNull(),
  guardrailPassed: boolean("guardrail_passed").notNull().default(true),
  flaggedReason: text("flagged_reason"),
  status: text("status").notNull().default("success"),
  // AI hardening: observability dimensions
  traceId: text("trace_id"),
  provider: text("provider"),
  tier: text("tier"),
  costUsd: real("cost_usd").default(0),
  cacheHit: text("cache_hit"), // "exact" | "semantic" | null
  fallbackUsed: boolean("fallback_used").default(false),
  errorType: text("error_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("ai_traces_created_idx").on(t.createdAt), index("ai_traces_feature_idx").on(t.feature)]);

// ---------- CDC: transactional outbox + index bookkeeping ----------
export const outboxEvents = pgTable("outbox_events", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  aggregateType: text("aggregate_type").notNull(), // "document" | "lms_chapter" | "clarity_lesson" | "lms_attachment"
  aggregateId: text("aggregate_id").notNull(),
  op: text("op").notNull(), // "upsert" | "delete"
  payload: jsonb("payload"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("outbox_pending_idx").on(t.processedAt, t.createdAt)]);

export const indexState = pgTable("index_state", {
  id: text("id").primaryKey(), // `${aggregateType}:${aggregateId}`
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  contentHash: text("content_hash").notNull(),
  embeddingVersion: text("embedding_version").notNull(),
  userId: text("user_id"),
  indexedAt: timestamp("indexed_at").notNull().defaultNow(),
});

// ---------- Human-in-the-loop review queue ----------
export const aiReviewQueue = pgTable("ai_review_queue", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  traceId: text("trace_id"),
  feature: text("feature").notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  input: text("input").notNull(),
  output: text("output"),
  reason: text("reason").notNull(),
  riskScore: real("risk_score").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | approved | edited | rejected
  reviewerId: text("reviewer_id").references(() => user.id, { onDelete: "set null" }),
  editedOutput: text("edited_output"),
  reviewerNote: text("reviewer_note"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
}, (t) => [index("review_status_idx").on(t.status, t.createdAt)]);

// ---------- Learning-to-Rank implicit/explicit feedback ----------
export const ragFeedback = pgTable("rag_feedback", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  traceId: text("trace_id"),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  query: text("query").notNull(),
  docId: text("doc_id").notNull(),
  rank: integer("rank").notNull(),
  event: text("event").notNull(), // impression | click | cited | thumbs_up | thumbs_down | dwell
  value: real("value").default(1),
  features: jsonb("features"), // ranking features captured at serve time
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("rag_feedback_trace_idx").on(t.traceId), index("rag_feedback_created_idx").on(t.createdAt)]);

export const adminNotifications = pgTable("admin_notifications", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiTracesRelations = relations(aiTraces, ({ one }) => ({
  user: one(user, {
    fields: [aiTraces.userId],
    references: [user.id],
  }),
}));

export const liveClassEnrollmentsRelations = relations(liveClassEnrollments, ({ one }) => ({
  meeting: one(meetings, {
    fields: [liveClassEnrollments.meetingId],
    references: [meetings.id],
  }),
  user: one(user, {
    fields: [liveClassEnrollments.userId],
    references: [user.id],
  }),
}));