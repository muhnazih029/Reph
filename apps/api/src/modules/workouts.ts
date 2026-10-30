import { Hono } from "hono";
import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import {
  createWorkoutRequestSchema,
  finishWorkoutRequestSchema,
  updateWorkoutRequestSchema,
  type Workout,
  type WorkoutEntry,
  type WorkoutSet,
} from "@reph/contracts";
import type { DrizzleDb } from "../db/client";
import { workoutEntries, workoutSets, workouts } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { ApiError, isForeignKeyRefusal } from "../lib/errors";
import { parsePagination } from "../lib/pagination";
import { epochMs, numericToNumber, parseOrThrow, toNumeric } from "../lib/serialize";

type WorkoutRow = InferSelectModel<typeof workouts>;
type EntryRow = InferSelectModel<typeof workoutEntries>;
type SetRow = InferSelectModel<typeof workoutSets>;

function toSetDTO(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    type: row.type,
    weightKg: numericToNumber(row.weightKg),
    reps: row.reps,
    rpe: numericToNumber(row.rpe),
    durationSeconds: row.durationSeconds,
    distanceMeters: numericToNumber(row.distanceMeters),
    calories: row.calories,
    done: row.done,
    position: row.position,
  };
}

function toEntryDTO(row: EntryRow, sets: SetRow[]): WorkoutEntry {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    notes: row.notes,
    supersetId: row.supersetId,
    position: row.position,
    sets: sets.map(toSetDTO),
  };
}

export function toWorkoutDTO(
  row: WorkoutRow,
  entries: EntryRow[],
  setsByEntry: Map<string, SetRow[]>,
): Workout {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    notes: row.notes,
    status: row.status,
    startTime: epochMs(row.startTime),
    endTime: row.endTime === null ? null : epochMs(row.endTime),
    bodyWeightKg: numericToNumber(row.bodyWeightKg),
    entries: entries.map((entry) => toEntryDTO(entry, setsByEntry.get(entry.id) ?? [])),
    createdAt: epochMs(row.createdAt),
    updatedAt: epochMs(row.updatedAt),
  };
}

async function loadSets(db: DrizzleDb, entryIds: string[]): Promise<Map<string, SetRow[]>> {
  if (entryIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(workoutSets)
    .where(inArray(workoutSets.entryId, entryIds))
    .orderBy(asc(workoutSets.position));
  const grouped = new Map<string, SetRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.entryId);
    if (bucket) bucket.push(row);
    else grouped.set(row.entryId, [row]);
  }
  return grouped;
}

export async function toWorkout(db: DrizzleDb, row: WorkoutRow): Promise<Workout> {
  const entries = await db
    .select()
    .from(workoutEntries)
    .where(eq(workoutEntries.workoutId, row.id))
    .orderBy(asc(workoutEntries.position));
  const setsByEntry = await loadSets(
    db,
    entries.map((entry) => entry.id),
  );
  return toWorkoutDTO(row, entries, setsByEntry);
}

/** Pre-check so an active-workout clash reads as a friendly 409 (the
 * partial-unique index remains the hard backstop). */
async function activeExists(db: DrizzleDb): Promise<boolean> {
  const [row] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.userId, OWNER_USER_ID), eq(workouts.status, "active")));
  return row !== undefined;
}

// Workouts — the active session lives server-side with status='active'
// (docs/specs/PRD-API.md §3, ADR-004). PATCH replaces the full children of
// the workout inside one transaction (nested write semantics).

export function workoutsModule({ db }: { db: DrizzleDb }) {
  const module = new Hono();

  module.get("/", async (context) => {
    const { limit, before } = parsePagination(context.req.query());

    const filters = [eq(workouts.userId, OWNER_USER_ID)];
    if (before !== null) {
      filters.push(lt(workouts.startTime, new Date(before)));
    }
    const rows = await db
      .select()
      .from(workouts)
      .where(and(...filters))
      .orderBy(desc(workouts.startTime))
      .limit(limit);

    const entries = rows.length
      ? await db
          .select()
          .from(workoutEntries)
          .where(
            inArray(
              workoutEntries.workoutId,
              rows.map((row) => row.id),
            ),
          )
          .orderBy(asc(workoutEntries.position))
      : [];
    const setsByEntry = await loadSets(
      db,
      entries.map((entry) => entry.id),
    );

    const byWorkout = new Map<string, EntryRow[]>();
    for (const entry of entries) {
      const bucket = byWorkout.get(entry.workoutId);
      if (bucket) bucket.push(entry);
      else byWorkout.set(entry.workoutId, [entry]);
    }
    return context.json(
      rows.map((row) => toWorkoutDTO(row, byWorkout.get(row.id) ?? [], setsByEntry)),
    );
  });

  module.get("/active", async (context) => {
    const [row] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.userId, OWNER_USER_ID), eq(workouts.status, "active")));
    return context.json(row ? await toWorkout(db, row) : null);
  });

  module.post("/", async (context) => {
    const body = parseOrThrow(createWorkoutRequestSchema, await context.req.json());
    if (await activeExists(db)) {
      throw ApiError.conflict("An active workout already exists");
    }
    const [row] = await db
      .insert(workouts)
      .values({ userId: OWNER_USER_ID, title: body.title ?? "" })
      .returning()
      .catch((error: unknown) => {
        if (isForeignKeyRefusal(error)) {
          throw ApiError.conflict("An active workout already exists");
        }
        throw error;
      });
    return context.json(await toWorkout(db, row!), 201);
  });

  module.get("/:id", async (context) => {
    const [row] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, context.req.param("id")));
    if (!row) throw ApiError.notFound("Workout not found");
    return context.json(await toWorkout(db, row));
  });

  module.patch("/:id", async (context) => {
    const body = parseOrThrow(updateWorkoutRequestSchema, await context.req.json());
    const id = context.req.param("id");
    const [row] = await db.select().from(workouts).where(eq(workouts.id, id));
    if (!row) throw ApiError.notFound("Workout not found");
    if (epochMs(row.updatedAt) !== body.expectedUpdatedAt) {
      throw ApiError.conflict("Workout was modified by another writer", {
        expectedUpdatedAt: body.expectedUpdatedAt,
        actualUpdatedAt: epochMs(row.updatedAt),
      });
    }

    let updated: WorkoutRow;
    try {
      updated = await db.transaction(async (tx) => {
        const [after] = await tx
          .update(workouts)
          .set({
            title: body.title ?? row.title,
            notes: body.notes ?? row.notes,
            bodyWeightKg:
              body.bodyWeightKg === undefined
                ? row.bodyWeightKg
                : body.bodyWeightKg === null
                  ? null
                  : toNumeric(body.bodyWeightKg),
            updatedAt: new Date(),
          })
          .where(eq(workouts.id, id))
          .returning();

        if (body.entries !== undefined) {
          // full replace of children — entry ids are client-generated so
          // idempotent retries are safe (docs/specs/PRD-API.md §3)
          await tx.delete(workoutEntries).where(eq(workoutEntries.workoutId, id));
          if (body.entries.length > 0) {
            await tx.insert(workoutEntries).values(
              body.entries.map((entry) => ({
                id: entry.id,
                workoutId: id,
                exerciseId: entry.exerciseId,
                notes: entry.notes,
                supersetId: entry.supersetId,
                position: entry.position,
              })),
            );
            const setRows = body.entries.flatMap((entry) =>
              entry.sets.map((set) => ({
                id: set.id,
                entryId: entry.id,
                type: set.type,
                weightKg: set.weightKg === null ? null : toNumeric(set.weightKg),
                reps: set.reps,
                rpe: set.rpe === null ? null : toNumeric(set.rpe),
                durationSeconds: set.durationSeconds,
                distanceMeters: set.distanceMeters === null ? null : toNumeric(set.distanceMeters),
                calories: set.calories,
                done: set.done,
                position: set.position,
              })),
            );
            if (setRows.length > 0) {
              await tx.insert(workoutSets).values(setRows);
            }
          }
        }
        return after!;
      });
    } catch (error) {
      if (isForeignKeyRefusal(error)) {
        throw ApiError.badRequest("Entry references an unknown exercise");
      }
      throw error;
    }

    return context.json(await toWorkout(db, updated));
  });

  module.post("/:id/finish", async (context) => {
    const body = parseOrThrow(finishWorkoutRequestSchema, await context.req.json());
    const id = context.req.param("id");
    const [row] = await db.select().from(workouts).where(eq(workouts.id, id));
    if (!row) throw ApiError.notFound("Workout not found");
    if (row.status === "completed") {
      throw ApiError.conflict("Workout is already finished");
    }
    if (epochMs(row.updatedAt) !== body.expectedUpdatedAt) {
      throw ApiError.conflict("Workout was modified by another writer", {
        expectedUpdatedAt: body.expectedUpdatedAt,
        actualUpdatedAt: epochMs(row.updatedAt),
      });
    }
    const [finished] = await db
      .update(workouts)
      .set({ status: "completed", endTime: new Date(), updatedAt: new Date() })
      .where(eq(workouts.id, id))
      .returning();
    return context.json(await toWorkout(db, finished!));
  });

  module.delete("/:id", async (context) => {
    const id = context.req.param("id");
    const deleted = await db.delete(workouts).where(eq(workouts.id, id)).returning();
    if (deleted.length === 0) throw ApiError.notFound("Workout not found");
    return context.body(null, 204);
  });

  return module;
}
