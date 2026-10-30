import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { join } from "node:path";
import * as schema from "./schema";
import { exercises } from "./schema";
import { seedExercises } from "./seed";

// Seed gate — docs/data/db-schema.md §5: ≥ 120 curated exercises, every
// muscle_group present, ≥ 10 cardio, idempotent upsert for global rows.

let client: PGlite;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
});

afterAll(async () => {
  await client?.close();
});

describe("seedExercises", () => {
  it("upserts ≥120 idempotently with full group coverage and ≥10 cardio", async () => {
    const db = drizzle(client, { schema });

    const first = await seedExercises(db);
    expect(first).toBeGreaterThanOrEqual(140);

    // idempotency: a second run upserts the same rows — nothing duplicated
    const again = await seedExercises(db);
    expect(again).toBe(first);
    const seeded = await db
      .select()
      .from(exercises)
      .where(sql`user_id is null`);
    expect(seeded).toHaveLength(first);

    const names = new Set(seeded.map((row) => row.name));
    expect(names.size).toBe(first); // no duplicate names inside the library

    const groups = new Set(seeded.map((row) => row.muscleGroup));
    expect(groups).toContain("chest");
    expect(groups).toContain("back");
    expect(groups).toContain("shoulders");
    expect(groups).toContain("upper_arms");
    expect(groups).toContain("forearms");
    expect(groups).toContain("hips");
    expect(groups).toContain("thighs");
    expect(groups).toContain("calves");
    expect(groups).toContain("waist");
    expect(groups).toContain("cardio");

    expect(seeded.filter((row) => row.type === "cardio").length).toBeGreaterThanOrEqual(10);
  });
});
