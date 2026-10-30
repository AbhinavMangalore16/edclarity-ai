CREATE TYPE "public"."meeting_status" AS ENUM('active', 'completed', 'processing', 'scheduled', 'cancelled');--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" text,
	"content" text,
	"type" text,
	"document_structure" text,
	"embedding" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text
);
--> statement-breakpoint
CREATE TABLE "memory_items" (
	"id" text,
	"user_id" text,
	"last_accessed" timestamp,
	"concept" text,
	"error_pattern" text,
	"confidence_level" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text,
	"session_id" text,
	"role" text,
	"content" text,
	"created_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "status" SET DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "start_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "end_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "meetings" ALTER COLUMN "end_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "transcript" text;