import { createMiddleware } from "hono/factory";
import { ApiError } from "./errors";

// Bearer-token auth seam — docs/specs/PRD-API.md §2. The single-user MVP
// authenticates via REPH_API_TOKEN; an empty token disables auth (local dev
// only). Real accounts replace this in Phase 4 without route changes.

export const OWNER_USER_ID = "0c4fafcf-1b30-4f5c-a1de-d2fabe380b31";

export function createAuthMiddleware(rephApiToken: string) {
  return createMiddleware(async (context, next) => {
    if (context.req.path.endsWith("/image")) {
      await next();
      return;
    }
    const header = context.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (token !== rephApiToken) {
      throw ApiError.unauthorized();
    }
    await next();
  });
}
