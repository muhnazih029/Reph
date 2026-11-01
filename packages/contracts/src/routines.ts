import { z } from "zod";
import { idSchema, epochMsSchema, setTypeSchema } from "./enums";

// Routine blueprint schemas — Phase 2 Track A.

export const routineSetSchema = z.object({
  id: idSchema,
  position: z.number().int().nonnegative(),
  type: setTypeSchema,
  reps: z.number().int().nonnegative().nullable(),
  weightKg: z.number().nonnegative().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  distanceMeters: z.number().nonnegative().nullable(),
  rpe: z.number().min(0).max(10).nullable(),
});
export type RoutineSet = z.infer<typeof routineSetSchema>;

export const routineEntrySchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  position: z.number().int().nonnegative(),
  notes: z.string(),
  supersetId: idSchema.nullable(),
  sets: z.array(routineSetSchema),
});
export type RoutineEntry = z.infer<typeof routineEntrySchema>;

export const routineSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  folderId: idSchema.nullable(),
  name: z.string().min(1),
  description: z.string().nullable(),
  position: z.number().int().nonnegative(),
  entries: z.array(routineEntrySchema),
  createdAt: epochMsSchema,
  updatedAt: epochMsSchema,
});
export type Routine = z.infer<typeof routineSchema>;

export const routineFolderSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  name: z.string().min(1),
  position: z.number().int().nonnegative(),
  createdAt: epochMsSchema,
});
export type RoutineFolder = z.infer<typeof routineFolderSchema>;

export const createRoutineRequestSchema = z.object({
  name: routineSchema.shape.name,
  description: routineSchema.shape.description.optional(),
  folderId: routineSchema.shape.folderId.optional(),
  position: routineSchema.shape.position.optional(),
  entries: z.array(routineEntrySchema).optional(),
});
export type CreateRoutineInput = z.infer<typeof createRoutineRequestSchema>;

export const updateRoutineRequestSchema = z.object({
  expectedUpdatedAt: epochMsSchema,
  name: routineSchema.shape.name.optional(),
  description: routineSchema.shape.description.optional(),
  folderId: routineSchema.shape.folderId.optional(),
  position: routineSchema.shape.position.optional(),
  entries: z.array(routineEntrySchema).optional(),
});
export type UpdateRoutineInput = z.infer<typeof updateRoutineRequestSchema>;

export const createRoutineFolderRequestSchema = z.object({
  name: routineFolderSchema.shape.name,
  position: routineFolderSchema.shape.position.optional(),
});
export type CreateRoutineFolderInput = z.infer<typeof createRoutineFolderRequestSchema>;

export const updateRoutineFolderRequestSchema = z.object({
  name: routineFolderSchema.shape.name.optional(),
  position: routineFolderSchema.shape.position.optional(),
});
export type UpdateRoutineFolderInput = z.infer<typeof updateRoutineFolderRequestSchema>;
