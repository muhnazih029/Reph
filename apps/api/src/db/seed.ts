import { sql } from "drizzle-orm";
import { exercises } from "./schema";
import type { DrizzleDb } from "./client";

// Global exercise library (≥ 120 curated rows) — docs/data/db-schema.md §5.
// Idempotent: upserts by name for global rows (`user_id IS NULL`), so
// re-running never duplicates and re-syncs muscle/equipment/type.

type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "upper_arms"
  | "forearms"
  | "hips"
  | "thighs"
  | "calves"
  | "waist"
  | "cardio";

type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "kettlebell"
  | "bodyweight"
  | "band"
  | "other";

type SeedExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  type: "strength" | "cardio";
};

const st = (name: string, muscleGroup: MuscleGroup, equipment: Equipment): SeedExercise => ({
  name,
  muscleGroup,
  equipment,
  type: "strength",
});

const cd = (name: string, equipment: Equipment = "bodyweight"): SeedExercise => ({
  name,
  muscleGroup: "cardio",
  equipment,
  type: "cardio",
});

export const SEED_LIBRARY: SeedExercise[] = [
  // — chest —
  st("Bench Press", "chest", "barbell"),
  st("Incline Bench Press", "chest", "barbell"),
  st("Decline Bench Press", "chest", "barbell"),
  st("Close-Grip Bench Press", "chest", "barbell"),
  st("Dumbbell Bench Press", "chest", "dumbbell"),
  st("Incline Dumbbell Press", "chest", "dumbbell"),
  st("Decline Dumbbell Press", "chest", "dumbbell"),
  st("Dumbbell Fly", "chest", "dumbbell"),
  st("Incline Dumbbell Fly", "chest", "dumbbell"),
  st("Cable Fly", "chest", "cable"),
  st("Incline Cable Fly", "chest", "cable"),
  st("Cable Crossover", "chest", "cable"),
  st("Machine Chest Press", "chest", "machine"),
  st("Pec Deck", "chest", "machine"),
  st("Push-Up", "chest", "bodyweight"),
  st("Incline Push-Up", "chest", "bodyweight"),
  st("Decline Push-Up", "chest", "bodyweight"),
  st("Weighted Push-Up", "chest", "bodyweight"),
  st("Band Chest Press", "chest", "band"),
  st("Svend Press", "chest", "other"),
  // — back —
  st("Deadlift", "back", "barbell"),
  st("Barbell Row", "back", "barbell"),
  st("Pendlay Row", "back", "barbell"),
  st("T-Bar Row", "back", "barbell"),
  st("Rack Pull", "back", "barbell"),
  st("Pull-Up", "back", "bodyweight"),
  st("Chin-Up", "back", "bodyweight"),
  st("Neutral-Grip Pull-Up", "back", "bodyweight"),
  st("Inverted Row", "back", "bodyweight"),
  st("Lat Pulldown", "back", "cable"),
  st("Close-Grip Lat Pulldown", "back", "cable"),
  st("Straight-Arm Pulldown", "back", "cable"),
  st("Seated Cable Row", "back", "cable"),
  st("One-Arm Dumbbell Row", "back", "dumbbell"),
  st("Dumbbell Pullover", "back", "dumbbell"),
  st("Chest-Supported Row", "back", "machine"),
  st("Seated Machine Row", "back", "machine"),
  st("Band Row", "back", "band"),
  st("Barbell Shrug", "back", "barbell"),
  st("Dumbbell Shrug", "back", "dumbbell"),
  // — shoulders —
  st("Overhead Press", "shoulders", "barbell"),
  st("Push Press", "shoulders", "barbell"),
  st("Landmine Press", "shoulders", "other"),
  st("Seated Dumbbell Shoulder Press", "shoulders", "dumbbell"),
  st("Arnold Press", "shoulders", "dumbbell"),
  st("Dumbbell Lateral Raise", "shoulders", "dumbbell"),
  st("Cable Lateral Raise", "shoulders", "cable"),
  st("Machine Lateral Raise", "shoulders", "machine"),
  st("Dumbbell Front Raise", "shoulders", "dumbbell"),
  st("Dumbbell Rear Delt Fly", "shoulders", "dumbbell"),
  st("Reverse Pec Deck", "shoulders", "machine"),
  st("Face Pull", "shoulders", "cable"),
  st("Cable Upright Row", "shoulders", "cable"),
  st("Band Pull-Apart", "shoulders", "band"),
  st("Pike Push-Up", "shoulders", "bodyweight"),
  // — upper arms: biceps —
  st("Barbell Curl", "upper_arms", "barbell"),
  st("Barbell Preacher Curl", "upper_arms", "barbell"),
  st("Dumbbell Curl", "upper_arms", "dumbbell"),
  st("Hammer Curl", "upper_arms", "dumbbell"),
  st("Incline Dumbbell Curl", "upper_arms", "dumbbell"),
  st("Concentration Curl", "upper_arms", "dumbbell"),
  st("Zottman Curl", "upper_arms", "dumbbell"),
  st("Cable Curl", "upper_arms", "cable"),
  st("Rope Hammer Curl", "upper_arms", "cable"),
  st("Band Curl", "upper_arms", "band"),
  st("Chin-Up Curl", "upper_arms", "bodyweight"),
  // — upper arms: triceps —
  st("Skull Crusher", "upper_arms", "barbell"),
  st("Dumbbell Overhead Triceps Extension", "upper_arms", "dumbbell"),
  st("Cable Overhead Triceps Extension", "upper_arms", "cable"),
  st("Cable Triceps Pushdown", "upper_arms", "cable"),
  st("Rope Triceps Pushdown", "upper_arms", "cable"),
  st("Single-Arm Cable Pushdown", "upper_arms", "cable"),
  st("Triceps Kickback", "upper_arms", "dumbbell"),
  st("Bench Dip", "upper_arms", "bodyweight"),
  st("Dip", "upper_arms", "bodyweight"),
  st("Band Triceps Extension", "upper_arms", "band"),
  st("Machine Dip", "upper_arms", "machine"),
  // — forearms —
  st("Dumbbell Wrist Curl", "forearms", "dumbbell"),
  st("Barbell Reverse Wrist Curl", "forearms", "barbell"),
  st("Barbell Reverse Curl", "forearms", "barbell"),
  st("Cable Reverse Curl", "forearms", "cable"),
  st("Farmer's Carry", "forearms", "dumbbell"),
  st("Plate Pinch Hold", "forearms", "other"),
  st("Dead Hang", "forearms", "bodyweight"),
  // — hips (glutes / hip hinges) —
  st("Barbell Hip Thrust", "hips", "barbell"),
  st("Barbell Glute Bridge", "hips", "barbell"),
  st("Glute Bridge", "hips", "bodyweight"),
  st("Single-Leg Glute Bridge", "hips", "bodyweight"),
  st("Cable Pull-Through", "hips", "cable"),
  st("Cable Glute Kickback", "hips", "cable"),
  st("Machine Hip Abduction", "hips", "machine"),
  st("Machine Hip Adduction", "hips", "machine"),
  st("Banded Lateral Walk", "hips", "band"),
  st("Clamshell", "hips", "band"),
  // — thighs —
  st("Barbell Back Squat", "thighs", "barbell"),
  st("Front Squat", "thighs", "barbell"),
  st("Overhead Squat", "thighs", "barbell"),
  st("Sumo Deadlift", "thighs", "barbell"),
  st("Romanian Deadlift", "thighs", "barbell"),
  st("Goblet Squat", "thighs", "kettlebell"),
  st("Kettlebell Swing", "thighs", "kettlebell"),
  st("Leg Press", "thighs", "machine"),
  st("Hack Squat", "thighs", "machine"),
  st("Smith Machine Squat", "thighs", "machine"),
  st("Leg Extension", "thighs", "machine"),
  st("Lying Leg Curl", "thighs", "machine"),
  st("Seated Leg Curl", "thighs", "machine"),
  st("Bulgarian Split Squat", "thighs", "dumbbell"),
  st("Walking Lunge", "thighs", "dumbbell"),
  st("Reverse Lunge", "thighs", "dumbbell"),
  st("Static Lunge", "thighs", "dumbbell"),
  st("Dumbbell Step-Up", "thighs", "dumbbell"),
  st("Air Squat", "thighs", "bodyweight"),
  st("Pistol Squat", "thighs", "bodyweight"),
  st("Wall Sit", "thighs", "bodyweight"),
  st("Sissy Squat", "thighs", "bodyweight"),
  st("Band Squat", "thighs", "band"),
  // — calves —
  st("Standing Calf Raise", "calves", "machine"),
  st("Seated Calf Raise", "calves", "machine"),
  st("Leg Press Calf Raise", "calves", "machine"),
  st("Donkey Calf Raise", "calves", "machine"),
  st("Single-Leg Calf Raise", "calves", "dumbbell"),
  st("Bodyweight Calf Raise", "calves", "bodyweight"),
  // — waist (core) —
  st("Plank", "waist", "bodyweight"),
  st("Side Plank", "waist", "bodyweight"),
  st("Crunch", "waist", "bodyweight"),
  st("Bicycle Crunch", "waist", "bodyweight"),
  st("Reverse Crunch", "waist", "bodyweight"),
  st("Sit-Up", "waist", "bodyweight"),
  st("Dead Bug", "waist", "bodyweight"),
  st("Hanging Knee Raise", "waist", "bodyweight"),
  st("Hanging Leg Raise", "waist", "bodyweight"),
  st("Toes-to-Bar", "waist", "bodyweight"),
  st("Dumbbell Side Bend", "waist", "dumbbell"),
  st("Russian Twist", "waist", "dumbbell"),
  st("Cable Crunch", "waist", "cable"),
  st("Ab Wheel Rollout", "waist", "other"),
  st("Landmine Rotation", "waist", "other"),
  // — cardio —
  cd("Running"),
  cd("Walking"),
  cd("Swimming"),
  cd("Jumping Jack"),
  cd("Burpee"),
  cd("High Knees"),
  cd("Mountain Climber"),
  cd("Jump Rope", "other"),
  cd("Boxing", "other"),
  cd("Treadmill Run", "machine"),
  cd("Stationary Bike", "machine"),
  cd("Rowing Machine", "machine"),
  cd("Elliptical", "machine"),
  cd("Stair Climber", "machine"),
  cd("Ski Erg", "machine"),
  cd("Air Bike", "machine"),
];

const INSERT_CHUNK = 200;

/**
 * Upsert the global library. Returns the number of seed rows processed.
 * Idempotent: safe to run repeatedly — names are unique for global rows
 * (`exercises_global_name_idx`, `user_id IS NULL`).
 */
export async function seedExercises(db: DrizzleDb): Promise<number> {
  const rows = SEED_LIBRARY.map((ex) => ({
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipment: ex.equipment,
    type: ex.type,
    isCustom: false,
  }));

  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await db
      .insert(exercises)
      .values(rows.slice(i, i + INSERT_CHUNK))
      .onConflictDoUpdate({
        target: exercises.name,
        targetWhere: sql`${exercises.userId} is null`,
        set: {
          muscleGroup: sql`excluded.muscle_group`,
          equipment: sql`excluded.equipment`,
          type: sql`excluded.type`,
        },
      });
  }

  return rows.length;
}

if (import.meta.main) {
  const { createDb } = await import("./client");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required — copy .env.example to .env (repo root).");
    process.exit(1);
  }
  const count = await seedExercises(createDb(url));
  console.log(`Exercise library seeded — ${count} rows upserted.`);
  process.exit(0);
}
