CREATE TABLE "body_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"weight_kg" numeric(6, 2),
	"body_fat_pct" numeric(5, 2),
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "body_metrics_user_recorded_idx" ON "body_metrics" USING btree ("user_id","recorded_at" desc);