ALTER TABLE "documents" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;