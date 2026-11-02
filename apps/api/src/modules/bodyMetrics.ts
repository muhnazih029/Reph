import { Hono } from "hono";
import { asc, desc, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { bodyMetricSchema, createBodyMetricRequestSchema, type BodyMetric } from "@reph/contracts";
import type { DrizzleDb } from "../db/client";
import { bodyMetrics } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { ApiError } from "../lib/errors";
import { epochMs, numericToNumber, parseOrThrow, toNumeric } from "../lib/serialize";

type Row = InferSelectModel<typeof bodyMetrics>;

function toDTO(row: Row): BodyMetric {
  return {
    id: row.id,
    userId: row.userId,
    recordedAt: epochMs(row.recordedAt),
    weightKg: numericToNumber(row.weightKg),
    bodyFatPct: numericToNumber(row.bodyFatPct),
    notes: row.notes,
    createdAt: epochMs(row.createdAt),
  };
}

export function bodyMetricsModule({ db }: { db: DrizzleDb }) {
  const app = new Hono();

  app.get("/", async (c) => {
    const rows = await db.select().from(bodyMetrics).orderBy(desc(bodyMetrics.recordedAt));
    return c.json(rows.map(toDTO));
  });

  app.post("/", async (c) => {
    const body = parseOrThrow(createBodyMetricRequestSchema, await c.req.json());
    const [row] = await db
      .insert(bodyMetrics)
      .values({
        userId: OWNER_USER_ID,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
        weightKg:
          body.weightKg === null || body.weightKg === undefined ? null : toNumeric(body.weightKg),
        bodyFatPct:
          body.bodyFatPct === null || body.bodyFatPct === undefined
            ? null
            : toNumeric(body.bodyFatPct),
        notes: body.notes ?? "",
      })
      .returning();
    return c.json(toDTO(row!), 201);
  });

  app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = parseOrThrow(createBodyMetricRequestSchema, await c.req.json());
    const [existing] = await db.select().from(bodyMetrics).where(eq(bodyMetrics.id, id));
    if (!existing) throw ApiError.notFound("Body metric not found");
    const [row] = await db
      .update(bodyMetrics)
      .set({
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : existing.recordedAt,
        weightKg:
          body.weightKg === undefined
            ? existing.weightKg
            : body.weightKg === null
              ? null
              : toNumeric(body.weightKg),
        bodyFatPct:
          body.bodyFatPct === undefined
            ? existing.bodyFatPct
            : body.bodyFatPct === null
              ? null
              : toNumeric(body.bodyFatPct),
        notes: body.notes ?? existing.notes,
      })
      .where(eq(bodyMetrics.id, id))
      .returning();
    return c.json(toDTO(row!));
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const res = await db.delete(bodyMetrics).where(eq(bodyMetrics.id, id));
    if (res.rowCount === 0) throw ApiError.notFound("Body metric not found");
    return c.body(null, 204);
  });

  return app;
}
