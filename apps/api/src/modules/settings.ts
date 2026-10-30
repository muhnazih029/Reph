import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { updateSettingsRequestSchema, type Settings } from "@reph/contracts";
import type { DrizzleDb } from "../db/client";
import { settings } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { epochMs, parseOrThrow } from "../lib/serialize";

type SettingsRow = InferSelectModel<typeof settings>;

export function toSettingsDTO(row: SettingsRow): Settings {
  return {
    userId: row.userId,
    weightUnit: row.weightUnit,
    distanceUnit: row.distanceUnit,
    restTimerSeconds: row.restTimerSeconds,
    theme: row.theme,
    language: row.language,
    updatedAt: epochMs(row.updatedAt),
  };
}

// Settings — one row per user, DB defaults seeded lazily on first read
// (docs/specs/PRD-API.md §3): kg, km, 90 s, dark, en.

export function settingsModule({ db }: { db: DrizzleDb }) {
  const module = new Hono();

  module.get("/", async (context) => {
    await db.insert(settings).values({ userId: OWNER_USER_ID }).onConflictDoNothing();
    const [row] = await db.select().from(settings).where(eq(settings.userId, OWNER_USER_ID));
    return context.json(toSettingsDTO(row!));
  });

  module.put("/", async (context) => {
    const body = parseOrThrow(updateSettingsRequestSchema, await context.req.json());
    await db.insert(settings).values({ userId: OWNER_USER_ID }).onConflictDoNothing();
    const patch = Object.fromEntries(
      Object.entries({
        weightUnit: body.weightUnit,
        distanceUnit: body.distanceUnit,
        restTimerSeconds: body.restTimerSeconds,
        theme: body.theme,
        language: body.language,
        updatedAt: new Date(),
      }).filter(([, value]) => value !== undefined),
    );
    const [row] = await db
      .update(settings)
      .set(patch)
      .where(eq(settings.userId, OWNER_USER_ID))
      .returning();
    return context.json(toSettingsDTO(row!));
  });

  return module;
}
