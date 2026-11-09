import { z } from "zod";

// Enums + primitive validators — docs/specs/contracts.md §1.
// If a shape is not defined in that file, it is not on the wire.

export const muscleGroupSchema = z.enum([
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
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

export const equipmentSchema = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebell",
  "bodyweight",
  "band",
  "other",
]);
export type Equipment = z.infer<typeof equipmentSchema>;

export const exerciseTypeSchema = z.enum(["strength", "cardio"]);
export type ExerciseType = z.infer<typeof exerciseTypeSchema>;

export const setTypeSchema = z.enum(["normal", "warmup", "drop", "failure"]);
export type SetType = z.infer<typeof setTypeSchema>;

export const workoutStatusSchema = z.enum(["active", "completed"]);
export type WorkoutStatus = z.infer<typeof workoutStatusSchema>;

export const weightUnitSchema = z.enum(["kg", "lbs"]);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

export const distanceUnitSchema = z.enum(["km", "mi"]);
export type DistanceUnit = z.infer<typeof distanceUnitSchema>;

export const themeSchema = z.enum(["dark", "light", "system"]);
export type Theme = z.infer<typeof themeSchema>;

export const languageSchema = z.enum(["en", "id"]);
export type Language = z.infer<typeof languageSchema>;

export const idSchema = z.string().uuid();
export const epochMsSchema = z.number().int().nonnegative();
