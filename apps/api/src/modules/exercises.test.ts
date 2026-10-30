import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { apiErrorSchema, exerciseSchema } from "@reph/contracts";
import { workouts, workoutEntries } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { createHarness, createLibraryExercise, type Harness } from "../test/harness";

// Exercises module — docs/specs/PRD-API.md §3 + §6. Global rows are
// read-only; exercises referenced by recorded workouts are never deleted.

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(() => h.close());

describe("GET /exercises", () => {
  it("lists global + custom and filters by q / muscleGroup", async () => {
    const chest = await createLibraryExercise(h.db, "Bench Press (api test)");
    await createLibraryExercise(h.db, "Barbell Squat (api test)", "thighs");
    await h.send("POST", "/exercises", {
      name: "Cable Curl (custom)",
      muscleGroup: "upper_arms",
      equipment: "cable",
      type: "strength",
    });

    const everything = (await (await h.get("/exercises")).json()) as Array<{ id: string }>;
    expect(everything).toHaveLength(3);

    const byQuery = (await (await h.get("/exercises?q=bench")).json()) as Array<{ id: string }>;
    expect(byQuery.map((row) => row.id)).toEqual([chest]);

    const byGroup = (await (await h.get("/exercises?muscleGroup=thighs")).json()) as Array<{
      muscleGroup: string;
    }>;
    expect(byGroup).toHaveLength(1);
    expect(byGroup[0]?.muscleGroup).toBe("thighs");
  });

  it("rejects an unknown muscleGroup with 400", async () => {
    const res = await h.get("/exercises?muscleGroup=toes");
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("bad_request");
  });
});

describe("POST /exercises", () => {
  it("creates a custom exercise and validates against the contract", async () => {
    const res = await h.send("POST", "/exercises", {
      name: "Incline DB Press (custom)",
      muscleGroup: "chest",
      equipment: "dumbbell",
      type: "strength",
    });
    expect(res.status).toBe(201);
    const parsed = exerciseSchema.parse(await res.json());
    expect(parsed.isCustom).toBe(true);
    expect(parsed.name).toBe("Incline DB Press (custom)");
  });
});

describe("PATCH /exercises/:id", () => {
  it("edits a custom exercise", async () => {
    const created = exerciseSchema.parse(
      await (
        await h.send("POST", "/exercises", {
          name: "Custom Row",
          muscleGroup: "back",
          equipment: "dumbbell",
          type: "strength",
        })
      ).json(),
    );
    const response = await h.send("PATCH", `/exercises/${created.id}`, { name: "Custom Row v2" });
    expect(response.status).toBe(200);
    expect(exerciseSchema.parse(await response.json()).name).toBe("Custom Row v2");
  });

  it("refuses to edit a global library row (409)", async () => {
    const id = await createLibraryExercise(h.db, "Global Press (refuse edit)");
    const res = await h.send("PATCH", `/exercises/${id}`, { name: "renamed" });
    expect(res.status).toBe(409);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("conflict");
  });
});

describe("DELETE /exercises/:id", () => {
  it("deletes an unused custom exercise (204)", async () => {
    const created = exerciseSchema.parse(
      await (
        await h.send("POST", "/exercises", {
          name: "Doomed Curl",
          muscleGroup: "upper_arms",
          equipment: "dumbbell",
          type: "strength",
        })
      ).json(),
    );
    const res = await h.send("DELETE", `/exercises/${created.id}`);
    expect(res.status).toBe(204);
  });

  it("refuses to delete a global row (409)", async () => {
    const id = await createLibraryExercise(h.db, "Global Press (refuse delete)");
    const res = await h.send("DELETE", `/exercises/${id}`);
    expect(res.status).toBe(409);
  });

  it("refuses to delete an exercise referenced by workouts (409)", async () => {
    const exerciseId = await createLibraryExercise(h.db, "Referenced Row");
    const [workout] = await h.db.insert(workouts).values({ userId: OWNER_USER_ID }).returning();
    await h.db.insert(workoutEntries).values({ workoutId: workout!.id, exerciseId });

    const res = await h.send("DELETE", `/exercises/${exerciseId}`);
    expect(res.status).toBe(409);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("conflict");
  });
});
