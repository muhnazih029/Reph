import { z } from "zod";
import { ApiError } from "./errors";

// Collection paging — docs/specs/PRD-API.md §2: `limit` (default 50, max 200),
// `before` cursor as epoch-ms. Responses are plain arrays.

export type Pagination = {
  limit: number;
  before: number | null;
};

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  before: z.coerce.number().int().nonnegative().optional(),
});

export function parsePagination(query: Record<string, string | undefined>): Pagination {
  const parsed = paginationQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw ApiError.badRequest("Invalid pagination parameters", {
      issues: parsed.error.issues,
    });
  }
  return { limit: parsed.data.limit, before: parsed.data.before ?? null };
}
