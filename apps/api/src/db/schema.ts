import { asc, desc, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Canonical data model — docs/data/db-schema.md. Keep the two in sync
// (review rule in docs/guides/DEVELOPMENT.md §5.3). Units: kg / meters /
// seconds; timestamps timestamptz (the API converts to epoch-ms at the
// boundary). `users` is deferred to Phase 4, so every `user_id` column is
// a plain uuid without FK until then.

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest",
  "back",
  "shoulders",
  "upper_arms",
  "forearms",
  "hips",
  "thighs",
  "calves",
  "waist",
  "cardio",
]);

export const equipmentEnum = pgEnum("equipment", [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebell",
  "bodyweight",
  "band",
  "other",
]);

export const exerciseTypeEnum = pgEnum("exercise_type", ["strength", "cardio"]);

export const setTypeEnum = pgEnum("set_type", ["normal", "warmup", "drop", "failure"]);

export const workoutStatusEnum = pgEnum("workout_status", ["active", "completed"]);

export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lbs"]);

export const distanceUnitEnum = pgEnum("distance_unit", ["km", "mi"]);

export const themeEnum = pgEnum("theme", ["dark", "light"]);

export const languageEnum = pgEnum("language", ["en", "id"]);

/** Global seeded library (user_id NULL) plus user-created exercises. */
export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    name: text("name").notNull(),
    muscleGroup: muscleGroupEnum("muscle_group").notNull(),
    equipment: equipmentEnum("equipment").notNull(),
    type: exerciseTypeEnum("type").notNull(),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("exercises_global_name_idx")
      .on(t.name)
      .where(sql`${t.userId} is null`),
  ],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: workoutStatusEnum("status").notNull().default("active"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
    endTime: timestamp("end_time", { withTimezone: true }),
    bodyWeightKg: numeric("body_weight_kg", { precision: 6, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workouts_user_start_time_idx").on(t.userId, desc(t.startTime)),
    // partial unique — one active workout per user (docs/data/db-schema.md §3)
    uniqueIndex("workouts_one_active_per_user_idx")
      .on(t.userId)
      .where(sql`${t.status} = 'active'`),
  ],
);

export const workoutEntries = pgTable(
  "workout_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    notes: text("notes").notNull().default(""),
    // soft link to sibling entries of the same workout — no FK (docs/data/db-schema.md §4)
    supersetId: uuid("superset_id"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("workout_entries_workout_position_idx").on(t.workoutId, asc(t.position))],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => workoutEntries.id, { onDelete: "cascade" }),
    type: setTypeEnum("type").notNull().default("normal"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    reps: integer("reps"),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
    durationSeconds: integer("duration_seconds"),
    distanceMeters: numeric("distance_meters", { precision: 8, scale: 2 }),
    calories: integer("calories"),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("workout_sets_entry_position_idx").on(t.entryId, asc(t.position))],
);

/** Reusable workout blueprint — Task A1 (Phase 2). */
export const routineFolders = pgTable(
  "routine_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routine_folders_user_position_idx").on(t.userId, asc(t.position))],
);

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    folderId: uuid("folder_id").references(() => routineFolders.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routines_user_folder_position_idx").on(t.userId, t.folderId, asc(t.position))],
);

export const routineEntries = pgTable(
  "routine_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    notes: text("notes").notNull().default(""),
    supersetId: uuid("superset_id"),
  },
  (t) => [index("routine_entries_routine_position_idx").on(t.routineId, asc(t.position))],
);

export const routineSets = pgTable(
  "routine_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    routineEntryId: uuid("routine_entry_id")
      .notNull()
      .references(() => routineEntries.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    type: setTypeEnum("type").notNull().default("normal"),
    reps: integer("reps"),
    weightKg: numeric("weight_kg", { precision: 8, scale: 3 }),
    durationSeconds: integer("duration_seconds"),
    distanceMeters: numeric("distance_meters", { precision: 8, scale: 2 }),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
  },
  (t) => [index("routine_sets_entry_position_idx").on(t.routineEntryId, asc(t.position))],
);
/** Single row per user; seeded lazily on first GET /settings (docs/data/db-schema.md §5). */
export const settings = pgTable("settings", {
  userId: uuid("user_id").primaryKey(),
  weightUnit: weightUnitEnum("weight_unit").notNull().default("kg"),
  distanceUnit: distanceUnitEnum("distance_unit").notNull().default("km"),
  restTimerSeconds: integer("rest_timer_seconds").notNull().default(90),
  theme: themeEnum("theme").notNull().default("dark"),
  language: languageEnum("language").notNull().default("en"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
