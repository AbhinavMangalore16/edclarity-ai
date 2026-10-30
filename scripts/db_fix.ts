import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");

  console.log("Applying missing database columns and tables...");

  // 1. Add course_id column to meetings table
  try {
    await db.execute(sql`
      ALTER TABLE meetings 
      ADD COLUMN IF NOT EXISTS course_id text REFERENCES lms_courses(id) ON DELETE SET NULL;
    `);
    console.log("SUCCESS: Added course_id column to meetings table.");
  } catch (err: any) {
    console.error("Error adding course_id to meetings:", err.message);
  }

  // 2. Create live_class_enrollment_status enum if not exists
  try {
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE live_class_enrollment_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("SUCCESS: Created live_class_enrollment_status enum.");
  } catch (err: any) {
    console.error("Error creating enum:", err.message);
  }

  // 3. Create live_class_enrollments table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS live_class_enrollments (
        id text PRIMARY KEY,
        meeting_id text NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        status live_class_enrollment_status NOT NULL DEFAULT 'pending',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("SUCCESS: Created live_class_enrollments table.");
  } catch (err: any) {
    console.error("Error creating live_class_enrollments table:", err.message);
  }

  // 4. Create teacher_earnings table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS teacher_earnings (
        id text PRIMARY KEY,
        teacher_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        course_id text NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
        purchase_id text REFERENCES lms_purchases(id) ON DELETE SET NULL,
        gross_amount integer NOT NULL,
        platform_fee integer NOT NULL,
        net_amount integer NOT NULL,
        status text NOT NULL DEFAULT 'cleared',
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("SUCCESS: Created teacher_earnings table.");
  } catch (err: any) {
    console.error("Error creating teacher_earnings table:", err.message);
  }

  // 5. Create ai_traces table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_traces (
        id text PRIMARY KEY,
        user_id text REFERENCES "user"(id) ON DELETE SET NULL,
        feature text NOT NULL,
        model text NOT NULL,
        prompt_snippet text NOT NULL,
        response_snippet text,
        prompt_tokens integer DEFAULT 0,
        completion_tokens integer DEFAULT 0,
        total_tokens integer DEFAULT 0,
        latency_ms integer NOT NULL,
        guardrail_passed boolean NOT NULL DEFAULT true,
        flagged_reason text,
        status text NOT NULL DEFAULT 'success',
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("SUCCESS: Created ai_traces table.");
  } catch (err: any) {
    console.error("Error creating ai_traces table:", err.message);
  }

  // 6. Create admin_notifications table if not exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id text PRIMARY KEY,
        type text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        severity text NOT NULL DEFAULT 'info',
        is_read boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("SUCCESS: Created admin_notifications table.");
  } catch (err: any) {
    console.error("Error creating admin_notifications table:", err.message);
  }

  // 7. Add AI observability columns to ai_traces
  try {
    await db.execute(sql`
      ALTER TABLE ai_traces
        ADD COLUMN IF NOT EXISTS trace_id text,
        ADD COLUMN IF NOT EXISTS provider text,
        ADD COLUMN IF NOT EXISTS tier text,
        ADD COLUMN IF NOT EXISTS cost_usd real DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cache_hit text,
        ADD COLUMN IF NOT EXISTS fallback_used boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS error_type text;
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_traces_created_idx ON ai_traces (created_at);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ai_traces_feature_idx ON ai_traces (feature);`);
    console.log("SUCCESS: Added observability columns & indexes to ai_traces.");
  } catch (err: any) {
    console.error("Error altering ai_traces:", err.message);
  }

  // 8. Create outbox_events table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS outbox_events (
        id text PRIMARY KEY,
        aggregate_type text NOT NULL,
        aggregate_id text NOT NULL,
        op text NOT NULL,
        payload jsonb,
        attempts integer NOT NULL DEFAULT 0,
        last_error text,
        processed_at timestamp,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox_events (processed_at, created_at);`);
    console.log("SUCCESS: Created outbox_events table.");
  } catch (err: any) {
    console.error("Error creating outbox_events table:", err.message);
  }

  // 9. Create index_state table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS index_state (
        id text PRIMARY KEY,
        aggregate_type text NOT NULL,
        aggregate_id text NOT NULL,
        content_hash text NOT NULL,
        embedding_version text NOT NULL,
        user_id text,
        indexed_at timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("SUCCESS: Created index_state table.");
  } catch (err: any) {
    console.error("Error creating index_state table:", err.message);
  }

  // 10. Create ai_review_queue table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_review_queue (
        id text PRIMARY KEY,
        trace_id text,
        feature text NOT NULL,
        user_id text REFERENCES "user"(id) ON DELETE SET NULL,
        input text NOT NULL,
        output text,
        reason text NOT NULL,
        risk_score real NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'pending',
        reviewer_id text REFERENCES "user"(id) ON DELETE SET NULL,
        edited_output text,
        reviewer_note text,
        metadata jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        reviewed_at timestamp
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS review_status_idx ON ai_review_queue (status, created_at);`);
    console.log("SUCCESS: Created ai_review_queue table.");
  } catch (err: any) {
    console.error("Error creating ai_review_queue table:", err.message);
  }

  // 11. Create rag_feedback table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rag_feedback (
        id text PRIMARY KEY,
        trace_id text,
        user_id text REFERENCES "user"(id) ON DELETE SET NULL,
        query text NOT NULL,
        doc_id text NOT NULL,
        rank integer NOT NULL,
        event text NOT NULL,
        value real DEFAULT 1,
        features jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS rag_feedback_trace_idx ON rag_feedback (trace_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS rag_feedback_created_idx ON rag_feedback (created_at);`);
    console.log("SUCCESS: Created rag_feedback table.");
  } catch (err: any) {
    console.error("Error creating rag_feedback table:", err.message);
  }

  console.log("Migration check complete!");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

