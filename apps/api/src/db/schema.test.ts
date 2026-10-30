import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { join } from "node:path";
import * as schema from "./schema";
import { exercises, workoutEntries, workoutSets, workouts } from "./schema";

// DB-backed unit tier on PGlite — real Postgres semantics, no TCP
// (docs/guides/DEVELOPMENT.md §5.2, ADR-003). Runs with compose down.

let client: PGlite;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
});

afterAll(async () => {
  await client?.close();
});

const userId = () => crypto.randomUUID();

function pgErrorCode(error: unknown): string | undefined {
  // drizzle-orm wraps driver errors in DrizzleQueryError; the Postgres
  // error (with its `code`) is the cause.
  const direct = error as { code?: string; cause?: { code?: string } } | null;
  return direct?.code ?? direct?.cause?.code;
}

describe("schema", () => {
  it("inserts a workout with nested entries/sets in a transaction and reads them ordered", async () => {
    const db = drizzle(client, { schema });
    const [exercise] = await db
      .insert(exercises)
      .values({
        name: "Bench Press (test)",
        muscleGroup: "chest",
        equipment: "barbell",
        type: "strength",
        isCustom: false,
      })
      .returning();

    const workoutId = await db.transaction(async (tx) => {
      const [workout] = await tx
        .insert(workouts)
        .values({ userId: userId(), title: "Push" })
        .returning();

      const [first, second] = await tx
        .insert(workoutEntries)
        .values([
          { workoutId: workout!.id, exerciseId: exercise!.id, position: 0 },
          { workoutId: workout!.id, exerciseId: exercise!.id, position: 1, notes: "second" },
        ])
        .returning();

      await tx.insert(workoutSets).values([
        { entryId: first!.id, weightKg: "80", reps: 5, done: true, position: 0 },
        { entryId: first!.id, type: "warmup", weightKg: "60", reps: 8, position: 1 },
        { entryId: second!.id, weightKg: "85", reps: 3, position: 0 },
      ]);

      return workout!.id;
    });

    const entries = await db
      .select()
      .from(workoutEntries)
      .where(eq(workoutEntries.workoutId, workoutId))
      .orderBy(asc(workoutEntries.position));

    expect(entries.map((e) => e.position)).toEqual([0, 1]);
    expect(entries[1]!.notes).toBe("second");

    const firstEntrySets = await db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.entryId, entries[0]!.id))
      .orderBy(asc(workoutSets.position));

    expect(firstEntrySets.map((s) => s.type)).toEqual(["normal", "warmup"]);
    expect(firstEntrySets[0]!.done).toBe(true);
  });

  it("cascades workout deletion to entries and sets", async () => {
    const db = drizzle(client, { schema });
    const [exercise] = await db
      .insert(exercises)
      .values({
        name: "Squat (test)",
        muscleGroup: "thighs",
        equipment: "barbell",
        type: "strength",
      })
      .returning();

    const [workout] = await db.insert(workouts).values({ userId: userId() }).returning();

    const [entry] = await db
      .insert(workoutEntries)
      .values({ workoutId: workout!.id, exerciseId: exercise!.id })
      .returning();

    await db.insert(workoutSets).values({ entryId: entry!.id, weightKg: "100", reps: 1 });

    await db.delete(workouts).where(eq(workouts.id, workout!.id));

    expect(await db.select().from(workoutEntries).where(eq(workoutEntries.id, entry!.id))).toEqual(
      [],
    );
    expect(await db.select().from(workoutSets).where(eq(workoutSets.entryId, entry!.id))).toEqual(
      [],
    );
  });

  it("restricts deleting an exercise referenced by an entry (23503)", async () => {
    const db = drizzle(client, { schema });
    const [exercise] = await db
      .insert(exercises)
      .values({ name: "Row (test)", muscleGroup: "back", equipment: "barbell", type: "strength" })
      .returning();

    const [workout] = await db.insert(workouts).values({ userId: userId() }).returning();
    await db.insert(workoutEntries).values({ workoutId: workout!.id, exerciseId: exercise!.id });

    let error: unknown;
    try {
      await db.delete(exercises).where(eq(exercises.id, exercise!.id));
    } catch (caught) {
      error = caught;
    }

    // RESTRICT delete: PGlite reports 23001 (restrict_violation),
    // stock Postgres 23503 (foreign_key_violation) — both mean "refused".
    const code = pgErrorCode(error);
    expect(code === "23001" || code === "23503").toBe(true);
  });

  it("enforces one active workout per user (23505)", async () => {
    const db = drizzle(client, { schema });
    const user = userId();

    await db.insert(workouts).values({ userId: user });

    let error: unknown;
    try {
      await db.insert(workouts).values({ userId: user, status: "active" });
    } catch (caught) {
      error = caught;
    }

    expect(pgErrorCode(error)).toBe("23505");

    // completing the first frees the slot
    await db.update(workouts).set({ status: "completed" }).where(eq(workouts.userId, user));
    const reactivated = await db.insert(workouts).values({ userId: user }).returning();
    expect(reactivated).toHaveLength(1);
  });
});
