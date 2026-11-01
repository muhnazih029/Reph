CREATE TABLE "routine_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"superset_id" uuid
);
--> statement-breakpoint
CREATE TABLE "routine_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_entry_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"type" "set_type" DEFAULT 'normal' NOT NULL,
	"reps" integer,
	"weight_kg" numeric(8, 3),
	"duration_seconds" integer,
	"distance_meters" numeric(8, 2),
	"rpe" numeric(3, 1)
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"folder_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_entries" ADD CONSTRAINT "routine_entries_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_sets" ADD CONSTRAINT "routine_sets_routine_entry_id_routine_entries_id_fk" FOREIGN KEY ("routine_entry_id") REFERENCES "public"."routine_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_folder_id_routine_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."routine_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_entries_routine_position_idx" ON "routine_entries" USING btree ("routine_id","position" asc);--> statement-breakpoint
CREATE INDEX "routine_folders_user_position_idx" ON "routine_folders" USING btree ("user_id","position" asc);--> statement-breakpoint
CREATE INDEX "routine_sets_entry_position_idx" ON "routine_sets" USING btree ("routine_entry_id","position" asc);--> statement-breakpoint
CREATE INDEX "routines_user_folder_position_idx" ON "routines" USING btree ("user_id","folder_id","position" asc);