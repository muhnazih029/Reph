import { Hono } from "hono";
import { sql } from "drizzle-orm";
import pkg from "../../package.json";
import type { DrizzleDb } from "../db/client";

// Liveness + DB ping for compose probes — docs/specs/PRD-API.md §3. No auth.

export function healthModule({ db }: { db: DrizzleDb }) {
  const module = new Hono();

  module.get("/health", async (context) => {
    let dbUp = true;
    try {
      await db.execute(sql`select 1`);
    } catch {
      dbUp = false;
    }
    return context.json({ status: "ok", db: dbUp ? "up" : "down", version: pkg.version });
  });

  return module;
}
