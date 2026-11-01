CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mime_type" text NOT NULL,
	"data" text NOT NULL,
	"weight_kg" numeric(6, 2),
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "progress_photos_user_taken_at_idx" ON "progress_photos" USING btree ("user_id","taken_at" desc);