import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { ProgressPhoto } from "@reph/contracts";
import type { DrizzleDb } from "../db/client";
import { progressPhotos } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { ApiError } from "../lib/errors";
import { epochMs } from "../lib/serialize";

type Row = InferSelectModel<typeof progressPhotos>;

function toDTO(row: Row): ProgressPhoto {
  return {
    id: row.id,
    userId: row.userId,
    workoutId: row.workoutId,
    takenAt: epochMs(row.takenAt),
    mimeType: row.mimeType,
    weightKg: row.weightKg === null ? null : Number(row.weightKg),
    notes: row.notes,
    createdAt: epochMs(row.createdAt),
  };
}

export function photosModule({ db }: { db: DrizzleDb }) {
  const app = new Hono();

  app.get("/", async (c) => {
    const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
    const offset = Number(c.req.query("offset") ?? 0);
    const workoutId = c.req.query("workoutId");
    const rows = await db
      .select()
      .from(progressPhotos)
      .where(workoutId ? eq(progressPhotos.workoutId, workoutId) : undefined)
      .orderBy(desc(progressPhotos.takenAt))
      .limit(limit)
      .offset(offset);
    return c.json(rows.map(toDTO));
  });

  app.post("/", async (c) => {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) throw ApiError.badRequest("file required");
    if (!file.type.startsWith("image/")) throw ApiError.badRequest("image/* only");
    if (file.size > 5 * 1024 * 1024) throw ApiError.badRequest("max 5MB");
    const buf = await file.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const data = `data:${file.type};base64,${base64}`;
    const weightKg = body["weightKg"] ? Number(body["weightKg"]) : null;
    const notes = typeof body["notes"] === "string" ? body["notes"] : "";
    const workoutId = typeof body["workoutId"] === "string" ? body["workoutId"] : null;
    const [row] = await db
      .insert(progressPhotos)
      .values({
        userId: OWNER_USER_ID,
        workoutId,
        mimeType: file.type,
        data,
        weightKg: weightKg === null ? null : String(weightKg),
        notes,
      })
      .returning();
    return c.json(toDTO(row!), 201);
  });

  app.get("/:id/image", async (c) => {
    const id = c.req.param("id");
    const [row] = await db.select().from(progressPhotos).where(eq(progressPhotos.id, id));
    if (!row) throw ApiError.notFound("Photo not found");
    // data is stored as data URL; strip prefix
    const comma = row.data.indexOf(",");
    const b64 = comma >= 0 ? row.data.slice(comma + 1) : row.data;
    const buf = Buffer.from(b64, "base64");
    return new Response(buf, {
      headers: { "Content-Type": row.mimeType, "Cache-Control": "public, max-age=31536000" },
    });
  });

  app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const [existing] = await db.select().from(progressPhotos).where(eq(progressPhotos.id, id));
    if (!existing) throw ApiError.notFound("Photo not found");
    const [row] = await db
      .update(progressPhotos)
      .set({
        notes: typeof body.notes === "string" ? body.notes : existing.notes,
        weightKg:
          body.weightKg === undefined
            ? existing.weightKg
            : body.weightKg === null
              ? null
              : String(body.weightKg),
      })
      .where(eq(progressPhotos.id, id))
      .returning();
    return c.json(toDTO(row!));
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const res = await db.delete(progressPhotos).where(eq(progressPhotos.id, id));
    if (res.rowCount === 0) throw ApiError.notFound("Photo not found");
    return c.body(null, 204);
  });

  return app;
}
