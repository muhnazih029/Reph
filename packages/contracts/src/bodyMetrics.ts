import { z } from "zod";
import { idSchema, epochMsSchema } from "./enums";

export const bodyMetricSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  recordedAt: epochMsSchema,
  weightKg: z.number().nullable(),
  notes: z.string(),
  createdAt: epochMsSchema,
});
export type BodyMetric = z.infer<typeof bodyMetricSchema>;

export const createBodyMetricRequestSchema = z.object({
  recordedAt: epochMsSchema.optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  notes: z.string().optional(),
});
export type CreateBodyMetricInput = z.infer<typeof createBodyMetricRequestSchema>;
