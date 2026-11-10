import { z } from "zod";

// Account + session contracts — docs/specs/PRD-API.md §2. The instance
// is self-hosted and single-user: one account owns the data, a login
// returns a session token the web client stores and sends as a bearer.

export const accountUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(80),
  createdAt: z.number(),
});
export type AccountUser = z.infer<typeof accountUserSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = loginRequestSchema.extend({
  name: z.string().min(1).max(80),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const authResponseSchema = z.object({
  user: accountUserSchema,
  token: z.string().min(16),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const authStatusSchema = z.object({
  accountExists: z.boolean(),
});
export type AuthStatus = z.infer<typeof authStatusSchema>;
