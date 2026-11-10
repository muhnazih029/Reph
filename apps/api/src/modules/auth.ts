import { Hono } from "hono";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import {
  accountUserSchema,
  authResponseSchema,
  authStatusSchema,
  loginRequestSchema,
  registerRequestSchema,
} from "@reph/contracts";
import type { DrizzleDb } from "../db/client";
import { users } from "../db/schema";
import { ApiError } from "../lib/errors";
import {
  OWNER_USER_ID,
  countAccounts,
  createSession,
  deleteSession,
  findSessionUser,
  hashPassword,
  verifyPassword,
  type AccountUser,
} from "../lib/auth";
import { parseOrThrow } from "../lib/serialize";

// Accounts — the self-hosted instance has one owner account. Registering
// creates it (the first time only); login exchanges the password for a
// session token; logout drops the session (docs/specs/PRD-API.md §2).

/** The account behind the request's session token — /logout and /me run
 *  outside the auth middleware, so they resolve the session themselves. */
async function sessionUser(
  context: Context,
  db: DrizzleDb,
): Promise<{ user: AccountUser; token: string }> {
  const header = context.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) throw ApiError.unauthorized();
  const user = await findSessionUser(db, token);
  if (!user) throw ApiError.unauthorized("Session expired or unknown");
  return { user, token };
}

function toUserDTO(row: { id: string; email: string; name: string; createdAt: Date }): AccountUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.getTime(),
  };
}

export function authModule({ db }: { db: DrizzleDb }) {
  const module = new Hono();

  module.get("/status", async (context) => {
    const body = authStatusSchema.parse({ accountExists: (await countAccounts(db)) > 0 });
    return context.json(body);
  });

  module.post("/register", async (context) => {
    const body = parseOrThrow(registerRequestSchema, await context.req.json());
    if ((await countAccounts(db)) > 0) {
      throw ApiError.conflict("This instance already has an account");
    }
    const passwordHash = await hashPassword(body.password);
    const [row] = await db
      .insert(users)
      .values({
        id: OWNER_USER_ID,
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
      })
      .returning();
    const token = await createSession(db, row!.id);
    return context.json(authResponseSchema.parse({ user: toUserDTO(row!), token }));
  });

  module.post("/login", async (context) => {
    const body = parseOrThrow(loginRequestSchema, await context.req.json());
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (!row) throw ApiError.unauthorized("Unknown email or wrong password");
    const ok = await verifyPassword(body.password, row.passwordHash);
    if (!ok) throw ApiError.unauthorized("Unknown email or wrong password");
    const token = await createSession(db, row.id);
    return context.json(authResponseSchema.parse({ user: toUserDTO(row), token }));
  });

  module.post("/logout", async (context) => {
    const { token } = await sessionUser(context, db);
    await deleteSession(db, token);
    return context.body(null, 204);
  });

  module.get("/me", async (context) => {
    const { user } = await sessionUser(context, db);
    return context.json(accountUserSchema.parse(user));
  });

  return module;
}
