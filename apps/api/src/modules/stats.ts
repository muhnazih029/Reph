import { Hono } from "hono";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { DrizzleDb } from "../db/client";
import { workouts } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";

export function statsModule({ db }: { db: DrizzleDb }) {
  const app = new Hono();

  app.get("/calendar", async (c) => {
    const year = Number(c.req.query("year") ?? new Date().getFullYear());
    const month = Number(c.req.query("month") ?? new Date().getMonth() + 1);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const rows = await db
      .select({
        day: sql<string>`to_char(${workouts.endTime}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, OWNER_USER_ID),
          eq(workouts.status, "completed"),
          gte(workouts.endTime, start),
          lte(workouts.endTime, end),
        ),
      )
      .groupBy(sql`to_char(${workouts.endTime}, 'YYYY-MM-DD')`);
    return c.json({
      year,
      month,
      days: rows.map((r) => ({ date: r.day, count: Number(r.count) })),
    });
  });

  app.get("/streak", async (c) => {
    const rows = await db
      .select({ d: sql<string>`to_char(${workouts.endTime}, 'YYYY-MM-DD')` })
      .from(workouts)
      .where(and(eq(workouts.userId, OWNER_USER_ID), eq(workouts.status, "completed")))
      .groupBy(sql`to_char(${workouts.endTime}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${workouts.endTime}, 'YYYY-MM-DD') desc`);
    const days = rows.map((r) => r.d);
    const set = new Set(days);
    // current streak
    let current = 0;
    const today = new Date();
    const cursor = new Date(today);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (set.has(key)) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    // longest
    let longest = 0;
    let run = 0;
    // eslint-disable-next-line unicorn/no-array-sort
    const sorted = [...set].sort();
    let prev: string | null = null;
    for (const d of sorted) {
      if (prev && daysBetween(prev, d) === 1) run++;
      else run = 1;
      if (run > longest) longest = run;
      prev = d;
    }
    return c.json({ current, longest });
  });

  return app;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
