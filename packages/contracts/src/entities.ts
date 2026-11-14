import { z } from "zod";
import {
  distanceUnitSchema,
  epochMsSchema,
  equipmentSchema,
  exerciseTypeSchema,
  idSchema,
  muscleGroupSchema,
  setTypeSchema,
  themeSchema,
  languageSchema,
  weightUnitSchema,
  workoutStatusSchema,
} from "./enums";

// Entity schemas — docs/specs/contracts.md §2.
// Timestamps are epoch-ms numbers; units are canonical (kg/meters/seconds).

export const exerciseSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(), // null = global seeded library
  name: z.string().min(1).max(80),
  muscleGroup: muscleGroupSchema,
  equipment: equipmentSchema,
  type: exerciseTypeSchema,
  isCustom: z.boolean(),
  imageData: z.array(z.string()).nullable().optional(),
  createdAt: epochMsSchema,
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const workoutSetSchema = z.object({
  id: idSchema,
  type: setTypeSchema,
  // strength fields (null for cardio sets)
  weightKg: z.number().min(0).max(999).nullable(),
  reps: z.number().int().min(0).max(9999).nullable(),
  rpe: z.number().min(0).max(10).nullable(),
  // cardio fields (null for strength sets)
  durationSeconds: z.number().int().min(0).nullable(),
  distanceMeters: z.number().min(0).nullable(),
  calories: z.number().int().min(0).nullable(),
  done: z.boolean(),
  position: z.number().int().min(0),
});
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const workoutEntrySchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  notes: z.string().max(2000),
  supersetId: idSchema.nullable(), // entries sharing an id form a superset
  position: z.number().int().min(0),
  sets: z.array(workoutSetSchema),
});
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>;

export const workoutSchema = z.object({
  id: idSchema,
  userId: idSchema,
  title: z.string().max(120),
  notes: z.string().max(5000),
  status: workoutStatusSchema,
  startTime: epochMsSchema,
  endTime: epochMsSchema.nullable(),
  bodyWeightKg: z.number().min(0).max(999).nullable(),
  entries: z.array(workoutEntrySchema), // ordered by position
  createdAt: epochMsSchema,
  updatedAt: epochMsSchema,
});
export type Workout = z.infer<typeof workoutSchema>;

export const settingsSchema = z.object({
  userId: idSchema,
  weightUnit: weightUnitSchema, // display only — storage is always kg
  distanceUnit: distanceUnitSchema, // display only — storage is always meters
  restTimerSeconds: z.number().int().min(0).max(3600),
  weeklyWorkoutGoal: z.number().int().min(0).max(7),
  theme: themeSchema,
  language: languageSchema,
  updatedAt: epochMsSchema,
});
export type Settings = z.infer<typeof settingsSchema>;
