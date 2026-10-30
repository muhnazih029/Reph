import { z } from "zod";

// Error envelope for every non-2xx response — docs/specs/contracts.md §4.
// Success responses are the entity arrays/objects themselves (no { data: … }).

export const apiErrorCodeSchema = z.enum([
  "bad_request",
  "unauthorized",
  "not_found",
  "conflict",
  "internal",
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
