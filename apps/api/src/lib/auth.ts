import { createMiddleware } from "hono/factory";
import { and, eq, gt } from "drizzle-orm";
import { ApiError } from "./errors";
import type { DrizzleDb } from "../db/client";
import { sessions, users } from "../db/schema";

// Account + session seam — docs/specs/PRD-API.md §2. The instance is
// self-hosted and single-user: one account owns the data, a login creates
// a session row, logout drops it. The legacy REPH_API_TOKEN still works
// as a dev shortcut.

export const OWNER_USER_ID = "0c4fafcf-1b30-4f5c-a1de-d2fabe380b31";

/** Sessions live for 30 days. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AccountUser = {
  id: string;
  email: string;
  name: string;
  createdAt: number;
};

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

function newSessionToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

export async function createSession(db: DrizzleDb, userId: string): Promise<string> {
  const token = newSessionToken();
  await db.insert(sessions).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

/** The account behind a session token, or null when it is unknown/expired. */
export async function findSessionUser(
  db: DrizzleDb,
  token: string,
): Promise<AccountUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.getTime(),
  };
}

export async function deleteSession(db: DrizzleDb, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function countAccounts(db: DrizzleDb): Promise<number> {
  const rows = await db.select({ id: users.id }).from(users);
  return rows.length;
}

export function createAuthMiddleware({
  db,
  rephApiToken,
}: {
  db: DrizzleDb;
  rephApiToken: string;
}) {
  return createMiddleware(async (context, next) => {
    if (context.req.path.endsWith("/image")) {
      await next();
      return;
    }
    // The account routes are the way in — they resolve the session
    // themselves (register/login are public, logout/me read the token).
    if (context.req.path.includes("/auth/")) {
      await next();
      return;
    }
    const header = context.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

    // Auth disabled (empty boot token, local dev): every request is the owner.
    if (!rephApiToken) {
      context.set("userId", OWNER_USER_ID);
      await next();
      return;
    }

    if (!token) throw ApiError.unauthorized();

    // Dev shortcut: the boot token keeps the API usable without a login.
    if (token === rephApiToken) {
      context.set("userId", OWNER_USER_ID);
      context.set("sessionToken", "");
      await next();
      return;
    }

    const user = await findSessionUser(db, token);
    if (!user) throw ApiError.unauthorized("Session expired or unknown");
    context.set("userId", user.id);
    context.set("sessionToken", token);
    await next();
  });
}
