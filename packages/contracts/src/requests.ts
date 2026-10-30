import { z } from "zod";
import { epochMsSchema } from "./enums";
import { exerciseSchema, settingsSchema, workoutEntrySchema, workoutSchema } from "./entities";

// Request-body schemas — docs/specs/contracts.md §3.
// Server-side validation targets; inferred types are the web client's inputs.

export const createExerciseRequestSchema = exerciseSchema.omit({
  id: true,
  userId: true,
  isCustom: true,
  createdAt: true,
});
export type CreateExerciseInput = z.infer<typeof createExerciseRequestSchema>;

export const createWorkoutRequestSchema = z.object({
  title: workoutSchema.shape.title.optional(),
});
export type CreateWorkoutInput = z.infer<typeof createWorkoutRequestSchema>;

export const updateWorkoutRequestSchema = z.object({
  expectedUpdatedAt: epochMsSchema, // 409 guard (docs/specs/PRD-API.md §2)
  title: workoutSchema.shape.title.optional(),
  notes: workoutSchema.shape.notes.optional(),
  bodyWeightKg: workoutSchema.shape.bodyWeightKg.optional(),
  entries: z.array(workoutEntrySchema).optional(), // full replace (docs/specs/PRD-API.md §3)
});
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutRequestSchema>;

export const finishWorkoutRequestSchema = z.object({
  expectedUpdatedAt: epochMsSchema,
});
export type FinishWorkoutInput = z.infer<typeof finishWorkoutRequestSchema>;

export const updateSettingsRequestSchema = settingsSchema
  .omit({
    userId: true,
    updatedAt: true,
  })
  .partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsRequestSchema>;
