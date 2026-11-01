import { z } from "zod";
import { idSchema, epochMsSchema } from "./enums";

export const progressPhotoSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  workoutId: idSchema.nullable(),
  takenAt: epochMsSchema,
  mimeType: z.string(),
  weightKg: z.number().nullable(),
  notes: z.string(),
  createdAt: epochMsSchema,
});
export type ProgressPhoto = z.infer<typeof progressPhotoSchema>;
