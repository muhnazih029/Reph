import { Hono } from "hono";
import { asc, eq, inArray } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import {
  createRoutineFolderRequestSchema,
  createRoutineRequestSchema,
  updateRoutineFolderRequestSchema,
  updateRoutineRequestSchema,
  type Routine,
  type RoutineEntry,
  type RoutineFolder,
  type RoutineSet,
} from "@reph/contracts";
import type { DrizzleDb } from "../db/client";
import {
  routineEntries,
  routineFolders,
  routineSets,
  routines,
  workouts,
  workoutEntries,
  workoutSets,
} from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { ApiError } from "../lib/errors";
import { epochMs, numericToNumber, parseOrThrow, toNumeric } from "../lib/serialize";
import { toWorkoutDTO } from "./workouts";

type RoutineRow = InferSelectModel<typeof routines>;
type EntryRow = InferSelectModel<typeof routineEntries>;
type SetRow = InferSelectModel<typeof routineSets>;
type FolderRow = InferSelectModel<typeof routineFolders>;

function toSetDTO(row: SetRow): RoutineSet {
  return {
    id: row.id,
    position: row.position,
    type: row.type,
    reps: row.reps,
    weightKg: numericToNumber(row.weightKg),
    durationSeconds: row.durationSeconds,
    distanceMeters: numericToNumber(row.distanceMeters),
    rpe: numericToNumber(row.rpe),
  };
}

function toEntryDTO(row: EntryRow, sets: SetRow[]): RoutineEntry {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    position: row.position,
    notes: row.notes,
    supersetId: row.supersetId,
    sets: sets.map(toSetDTO),
  };
}

function toRoutineDTO(
  row: RoutineRow,
  entries: EntryRow[],
  setsByEntry: Map<string, SetRow[]>,
): Routine {
  return {
    id: row.id,
    userId: row.userId,
    folderId: row.folderId,
    name: row.name,
    description: row.description,
    position: row.position,
    entries: entries.map((e) => toEntryDTO(e, setsByEntry.get(e.id) ?? [])),
    createdAt: epochMs(row.createdAt),
    updatedAt: epochMs(row.updatedAt),
  };
}

function toFolderDTO(row: FolderRow): RoutineFolder {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    position: row.position,
    createdAt: epochMs(row.createdAt),
  };
}

async function loadRoutine(db: DrizzleDb, id: string): Promise<Routine> {
  const [row] = await db.select().from(routines).where(eq(routines.id, id));
  if (!row) throw ApiError.notFound("Routine not found");
  const entries = await db
    .select()
    .from(routineEntries)
    .where(eq(routineEntries.routineId, id))
    .orderBy(asc(routineEntries.position));
  const entryIds = entries.map((e) => e.id);
  const sets = entryIds.length
    ? await db.select().from(routineSets).where(inArray(routineSets.routineEntryId, entryIds))
    : [];
  const byEntry = new Map<string, SetRow[]>();
  for (const s of sets) {
    const arr = byEntry.get(s.routineEntryId) ?? [];
    arr.push(s);
    byEntry.set(s.routineEntryId, arr);
  }
  for (const arr of byEntry.values()) arr.sort((a, b) => a.position - b.position);
  return toRoutineDTO(row, entries, byEntry);
}

export function routinesModule({ db }: { db: DrizzleDb }) {
  const app = new Hono();

  app.get("/routine-folders", async (c) => {
    const rows = await db.select().from(routineFolders).orderBy(asc(routineFolders.position));
    return c.json(rows.map(toFolderDTO));
  });

  app.post("/routine-folders", async (c) => {
    const body = parseOrThrow(createRoutineFolderRequestSchema, await c.req.json());
    const [row] = await db
      .insert(routineFolders)
      .values({ userId: OWNER_USER_ID, name: body.name, position: body.position ?? 0 })
      .returning();
    return c.json(toFolderDTO(row!), 201);
  });

  app.patch("/routine-folders/:id", async (c) => {
    const id = c.req.param("id");
    const body = parseOrThrow(updateRoutineFolderRequestSchema, await c.req.json());
    const [row] = await db
      .update(routineFolders)
      .set({ name: body.name, position: body.position })
      .where(eq(routineFolders.id, id))
      .returning();
    if (!row) throw ApiError.notFound("Folder not found");
    return c.json(toFolderDTO(row!));
  });

  app.delete("/routine-folders/:id", async (c) => {
    const id = c.req.param("id");
    const res = await db.delete(routineFolders).where(eq(routineFolders.id, id));
    if (res.rowCount === 0) throw ApiError.notFound("Folder not found");
    return c.body(null, 204);
  });

  app.get("/", async (c) => {
    const folderId = c.req.query("folderId");
    const rows = folderId
      ? await db
          .select()
          .from(routines)
          .where(eq(routines.folderId, folderId))
          .orderBy(asc(routines.position))
      : await db.select().from(routines).orderBy(asc(routines.position));
    const out: Routine[] = [];
    for (const r of rows) out.push(await loadRoutine(db, r.id));
    return c.json(out);
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    return c.json(await loadRoutine(db, id));
  });

  app.post("/", async (c) => {
    const body = parseOrThrow(createRoutineRequestSchema, await c.req.json());
    const routine = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(routines)
        .values({
          userId: OWNER_USER_ID,
          name: body.name,
          description: body.description ?? null,
          folderId: body.folderId ?? null,
          position: body.position ?? 0,
        })
        .returning();
      const entries = body.entries ?? [];
      for (const e of entries) {
        const [er] = await tx
          .insert(routineEntries)
          .values({
            routineId: row!.id,
            exerciseId: e.exerciseId,
            position: e.position,
            notes: e.notes,
            supersetId: e.supersetId,
          })
          .returning();
        for (const s of e.sets) {
          await tx.insert(routineSets).values({
            routineEntryId: er!.id,
            position: s.position,
            type: s.type,
            reps: s.reps,
            weightKg: s.weightKg === null ? null : toNumeric(s.weightKg),
            durationSeconds: s.durationSeconds,
            distanceMeters: s.distanceMeters === null ? null : toNumeric(s.distanceMeters),
            rpe: s.rpe === null ? null : toNumeric(s.rpe),
          });
        }
      }
      return row;
    });
    return c.json(await loadRoutine(db, routine!.id), 201);
  });

  app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = parseOrThrow(updateRoutineRequestSchema, await c.req.json());
    const [existing] = await db.select().from(routines).where(eq(routines.id, id));
    if (!existing) throw ApiError.notFound("Routine not found");
    if (epochMs(existing.updatedAt) !== body.expectedUpdatedAt) {
      throw ApiError.conflict("Routine was modified by another client");
    }
    await db.transaction(async (tx) => {
      await tx
        .update(routines)
        .set({
          name: body.name ?? existing.name,
          description: body.description === undefined ? existing.description : body.description,
          folderId: body.folderId === undefined ? existing.folderId : body.folderId,
          position: body.position ?? existing.position,
          updatedAt: new Date(),
        })
        .where(eq(routines.id, id));
      if (body.entries) {
        const oldEntries = await tx
          .select()
          .from(routineEntries)
          .where(eq(routineEntries.routineId, id));
        const oldIds = oldEntries.map((e) => e.id);
        if (oldIds.length) {
          await tx.delete(routineSets).where(inArray(routineSets.routineEntryId, oldIds));
          await tx.delete(routineEntries).where(eq(routineEntries.routineId, id));
        }
        for (const e of body.entries) {
          const [er] = await tx
            .insert(routineEntries)
            .values({
              routineId: id,
              exerciseId: e.exerciseId,
              position: e.position,
              notes: e.notes,
              supersetId: e.supersetId,
            })
            .returning();
          for (const s of e.sets) {
            await tx.insert(routineSets).values({
              routineEntryId: er!.id,
              position: s.position,
              type: s.type,
              reps: s.reps,
              weightKg: s.weightKg === null ? null : toNumeric(s.weightKg),
              durationSeconds: s.durationSeconds,
              distanceMeters: s.distanceMeters === null ? null : toNumeric(s.distanceMeters),
              rpe: s.rpe === null ? null : toNumeric(s.rpe),
            });
          }
        }
      }
    });
    return c.json(await loadRoutine(db, id));
  });

  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    const res = await db.delete(routines).where(eq(routines.id, id));
    if (res.rowCount === 0) throw ApiError.notFound("Routine not found");
    return c.body(null, 204);
  });

  app.post("/:id/start", async (c) => {
    const id = c.req.param("id");
    const routine = await loadRoutine(db, id);
    const workout = await db.transaction(async (tx) => {
      const [w] = await tx
        .insert(workouts)
        .values({ userId: OWNER_USER_ID, title: routine.name, startTime: new Date() })
        .returning();
      for (const e of routine.entries) {
        const [er] = await tx
          .insert(workoutEntries)
          .values({
            workoutId: w!.id,
            exerciseId: e.exerciseId,
            position: e.position,
            notes: e.notes,
            supersetId: e.supersetId,
          })
          .returning();
        for (const s of e.sets) {
          await tx.insert(workoutSets).values({
            entryId: er!.id,
            position: s.position,
            type: s.type,
            reps: s.reps,
            weightKg: s.weightKg === null ? null : toNumeric(s.weightKg),
            durationSeconds: s.durationSeconds,
            distanceMeters: s.distanceMeters === null ? null : toNumeric(s.distanceMeters),
            rpe: s.rpe === null ? null : toNumeric(s.rpe),
            done: false,
          });
        }
      }
      return w!;
    });
    const wRow = workout!;
    const entries = await db
      .select()
      .from(workoutEntries)
      .where(eq(workoutEntries.workoutId, wRow.id))
      .orderBy(asc(workoutEntries.position));
    const eIds = entries.map((e) => e.id);
    const sets = eIds.length
      ? await db.select().from(workoutSets).where(inArray(workoutSets.entryId, eIds))
      : [];
    const byEntry = new Map<string, (typeof sets)[number][]>();
    for (const s of sets) {
      const arr = byEntry.get(s.entryId) ?? [];
      arr.push(s);
      byEntry.set(s.entryId, arr);
    }
    for (const arr of byEntry.values()) arr.sort((a, b) => a.position - b.position);
    return c.json(toWorkoutDTO(wRow, entries, byEntry), 201);
  });

  return app;
}
