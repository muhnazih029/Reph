import { Hono } from "hono";
import { and, asc, eq, ilike, isNull, or } from "drizzle-orm";
import {
  createExerciseRequestSchema,
  equipmentSchema,
  muscleGroupSchema,
  type Exercise,
} from "@reph/contracts";
import type { DrizzleDb } from "../db/client";
import { exercises } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { ApiError, isForeignKeyRefusal } from "../lib/errors";
import { epochMs, parseOrThrow } from "../lib/serialize";
import type { InferSelectModel } from "drizzle-orm";

type ExerciseRow = InferSelectModel<typeof exercises>;

export function toExerciseDTO(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    muscleGroup: row.muscleGroup,
    equipment: row.equipment,
    type: row.type,
    isCustom: row.isCustom,
    imageData: row.imageData,
    createdAt: epochMs(row.createdAt),
  };
}

// Exercise library — global seeded rows (user_id NULL) plus the owner's
// custom exercises. Global rows are read-only (docs/specs/PRD-API.md §3).

export function exercisesModule({ db }: { db: DrizzleDb }) {
  const module = new Hono();

  module.get("/", async (context) => {
    const q = context.req.query("q");
    const rawMuscleGroup = context.req.query("muscleGroup");
    const rawEquipment = context.req.query("equipment");
    const limit = Math.min(Number(context.req.query("limit") ?? 50), 200);
    const offset = Math.max(Number(context.req.query("offset") ?? 0), 0);

    const filters = [or(isNull(exercises.userId), eq(exercises.userId, OWNER_USER_ID))];
    if (rawMuscleGroup) {
      filters.push(eq(exercises.muscleGroup, parseOrThrow(muscleGroupSchema, rawMuscleGroup)));
    }
    if (rawEquipment) {
      filters.push(eq(exercises.equipment, parseOrThrow(equipmentSchema, rawEquipment)));
    }
    if (q) {
      filters.push(ilike(exercises.name, `%${q}%`));
    }

    const rows = await db
      .select()
      .from(exercises)
      .where(and(...filters))
      .orderBy(asc(exercises.name))
      .limit(limit)
      .offset(offset);

    return context.json(rows.map(toExerciseDTO));
  });

  module.post("/", async (context) => {
    const body = parseOrThrow(createExerciseRequestSchema, await context.req.json());
    const [row] = await db
      .insert(exercises)
      .values({ ...body, userId: OWNER_USER_ID, isCustom: true })
      .returning();
    return context.json(toExerciseDTO(row!), 201);
  });

  module.get("/:id", async (context) => {
    const [row] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, context.req.param("id")));
    if (!row) throw ApiError.notFound("Exercise not found");
    return context.json(toExerciseDTO(row));
  });

  module.patch("/:id", async (context) => {
    const [row] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, context.req.param("id")));
    if (!row) throw ApiError.notFound("Exercise not found");
    if (row.userId === null) {
      throw ApiError.conflict("Global library exercises cannot be edited");
    }
    const body = parseOrThrow(createExerciseRequestSchema.partial(), await context.req.json());
    const [updated] = await db
      .update(exercises)
      .set(body)
      .where(eq(exercises.id, row.id))
      .returning();
    return context.json(toExerciseDTO(updated!));
  });

  module.delete("/:id", async (context) => {
    const [row] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, context.req.param("id")));
    if (!row) throw ApiError.notFound("Exercise not found");
    if (row.userId === null) {
      throw ApiError.conflict("Global library exercises cannot be deleted");
    }
    try {
      await db.delete(exercises).where(eq(exercises.id, row.id));
    } catch (error) {
      if (isForeignKeyRefusal(error)) {
        throw ApiError.conflict("Exercise is used by recorded workouts", {
          exerciseId: row.id,
        });
      }
      throw error;
    }
    return context.body(null, 204);
  });

  return module;
}
