CREATE TYPE "public"."distance_unit" AS ENUM('km', 'mi');--> statement-breakpoint
CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'bodyweight', 'band', 'other');--> statement-breakpoint
CREATE TYPE "public"."exercise_type" AS ENUM('strength', 'cardio');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'id');--> statement-breakpoint
CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'back', 'shoulders', 'upper_arms', 'forearms', 'hips', 'thighs', 'calves', 'waist', 'cardio');--> statement-breakpoint
CREATE TYPE "public"."set_type" AS ENUM('normal', 'warmup', 'drop', 'failure');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('dark', 'light');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lbs');--> statement-breakpoint
CREATE TYPE "public"."workout_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"muscle_group" "muscle_group" NOT NULL,
	"equipment" "equipment" NOT NULL,
	"type" "exercise_type" NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"weight_unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	"distance_unit" "distance_unit" DEFAULT 'km' NOT NULL,
	"rest_timer_seconds" integer DEFAULT 90 NOT NULL,
	"theme" "theme" DEFAULT 'dark' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"superset_id" uuid,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"type" "set_type" DEFAULT 'normal' NOT NULL,
	"weight_kg" numeric(6, 2),
	"reps" integer,
	"rpe" numeric(3, 1),
	"duration_seconds" integer,
	"distance_meters" numeric(8, 2),
	"calories" integer,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" "workout_status" DEFAULT 'active' NOT NULL,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"end_time" timestamp with time zone,
	"body_weight_kg" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_entry_id_workout_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."workout_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_global_name_idx" ON "exercises" USING btree ("name") WHERE "exercises"."user_id" is null;--> statement-breakpoint
CREATE INDEX "workout_entries_workout_position_idx" ON "workout_entries" USING btree ("workout_id","position" asc);--> statement-breakpoint
CREATE INDEX "workout_sets_entry_position_idx" ON "workout_sets" USING btree ("entry_id","position" asc);--> statement-breakpoint
CREATE INDEX "workouts_user_start_time_idx" ON "workouts" USING btree ("user_id","start_time" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "workouts_one_active_per_user_idx" ON "workouts" USING btree ("user_id") WHERE "workouts"."status" = 'active';