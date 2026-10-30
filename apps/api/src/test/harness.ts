import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { join } from "node:path";
import * as schema from "../db/schema";
import { exercises } from "../db/schema";
import { createApp } from "../app";
import type { DrizzleDb } from "../db/client";
import type { MuscleGroup } from "@reph/contracts";

// Unit-tier harness: PGlite (real Postgres semantics, no TCP) behind the
// same app factory production uses. Runs with compose down (ADR-003).

const AUTH_TOKEN = "test-token";
export const AUTH_HEADER = { authorization: `Bearer ${AUTH_TOKEN}` };

export interface Harness {
  app: ReturnType<typeof createApp>;
  db: DrizzleDb;
  get(path: string, headers?: Record<string, string>): Promise<Response>;
  send(
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Response>;
  close(): Promise<void>;
}

export async function createHarness(): Promise<Harness> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
  const app = createApp({ db, env: { rephApiToken: AUTH_TOKEN } });

  const get = (path: string, headers: Record<string, string> = {}) =>
    app.request(`/api/v1${path}`, {
      headers: { ...AUTH_HEADER, ...headers },
    }) as Promise<Response>;

  const send = (
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    app.request(`/api/v1${path}`, {
      method,
      headers: { "content-type": "application/json", ...AUTH_HEADER, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }) as Promise<Response>;

  return { app, db, get, send, close: () => client.close() };
}

/** Insert a global (seeded-style) library row; returns the exercise id. */
export async function createLibraryExercise(
  db: DrizzleDb,
  name: string,
  muscleGroup: MuscleGroup = "chest",
): Promise<string> {
  const [row] = await db
    .insert(exercises)
    .values({ name, muscleGroup, equipment: "barbell", type: "strength" })
    .returning();
  return row!.id;
}
