import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { apiErrorSchema, workoutSchema, type Workout } from "@reph/contracts";
import { workouts, workoutEntries, workoutSets } from "../db/schema";
import { OWNER_USER_ID } from "../lib/auth";
import { createHarness, createLibraryExercise, type Harness } from "../test/harness";

// Workouts module — create/active clash, nested full-replace PATCH with
// optimistic `expectedUpdatedAt`, finish guard, history cursor order.
// Tests share one active workout (`activeId`) since the API allows only one.

let h: Harness;
let activeId: string;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(() => h.close());

const uuid = () => crypto.randomUUID();

function entryObject(exerciseId: string, positions: number[]) {
  return {
    id: uuid(),
    exerciseId,
    notes: "",
    supersetId: null,
    position: 0,
    sets: positions.map((position) => ({
      id: uuid(),
      type: "normal" as const,
      weightKg: 80,
      reps: 5,
      rpe: 7.5,
      durationSeconds: null,
      distanceMeters: null,
      calories: null,
      done: true,
      position,
    })),
  };
}

describe("POST /workouts", () => {
  it("creates one active workout and rejects a second (409)", async () => {
    const res = await h.send("POST", "/workouts", {});
    expect(res.status).toBe(201);
    const created = workoutSchema.parse(await res.json());
    expect(created.status).toBe("active");
    expect(created.entries).toEqual([]);
    activeId = created.id;

    const second = await h.send("POST", "/workouts", { title: "no" });
    expect(second.status).toBe(409);
    expect(apiErrorSchema.parse(await second.json()).error.code).toBe("conflict");
  });
});

describe("GET /workouts/active", () => {
  it("returns the active row when one exists", async () => {
    const active = (await (await h.get("/workouts/active")).json()) as Workout;
    expect(active?.id).toBe(activeId);
    expect(active?.status).toBe("active");
  });
});

describe("PATCH /workouts/:id", () => {
  it("replaces entries atomically and stamps updatedAt", async () => {
    const exerciseId = await createLibraryExercise(h.db, "Patch Ex");
    const current = (await (await h.get(`/workouts/${activeId}`)).json()) as Workout;

    const res = await h.send("PATCH", `/workouts/${activeId}`, {
      expectedUpdatedAt: current.updatedAt,
      title: "Push day",
      bodyWeightKg: 82.5,
      entries: [entryObject(exerciseId, [0, 1])],
    });
    expect(res.status).toBe(200);
    const updated = workoutSchema.parse(await res.json());
    expect(updated.title).toBe("Push day");
    expect(updated.bodyWeightKg).toBe(82.5);
    expect(updated.entries).toHaveLength(1);
    expect(updated.entries[0]?.sets).toHaveLength(2);
    expect(updated.updatedAt).toBeGreaterThan(current.updatedAt);

    const rows = await h.db
      .select()
      .from(workoutEntries)
      .where(eq(workoutEntries.workoutId, activeId));
    expect(rows).toHaveLength(1);
    const sets = await h.db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.entryId, updated.entries[0]!.id));
    expect(sets).toHaveLength(2);
  });

  it("drops old child rows on the next replace (old entry + sets gone)", async () => {
    const exerciseId = await createLibraryExercise(h.db, "Replace Ex");
    const current = (await (await h.get(`/workouts/${activeId}`)).json()) as Workout;
    const oldEntryId = current.entries[0]!.id;

    const res = await h.send("PATCH", `/workouts/${activeId}`, {
      expectedUpdatedAt: current.updatedAt,
      entries: [entryObject(exerciseId, [0])],
    });
    expect(res.status).toBe(200);

    expect(
      await h.db.select().from(workoutEntries).where(eq(workoutEntries.id, oldEntryId)),
    ).toEqual([]);
  });

  it("rejects a stale expectedUpdatedAt with 409", async () => {
    const res = await h.send("PATCH", `/workouts/${activeId}`, {
      expectedUpdatedAt: 5,
      title: "stale",
    });
    expect(res.status).toBe(409);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("conflict");
  });

  it("rejects an unknown exercise with a friendly 400", async () => {
    const current = (await (await h.get(`/workouts/${activeId}`)).json()) as Workout;
    const res = await h.send("PATCH", `/workouts/${activeId}`, {
      expectedUpdatedAt: current.updatedAt,
      entries: [entryObject(crypto.randomUUID(), [0])],
    });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("bad_request");
  });
});

describe("GET /workouts + pagination", () => {
  it("orders desc by start_time and honors the before cursor", async () => {
    // seed a completed workout from yesterday; the active one is "today"
    const yesterday = new Date(Date.now() - 86_400_000);
    const [old] = await h.db
      .insert(workouts)
      .values({ userId: OWNER_USER_ID, status: "completed", startTime: yesterday, title: "Old" })
      .returning();

    const list = (await (await h.get("/workouts?limit=2")).json()) as Workout[];
    expect(list).toHaveLength(2);
    expect(
      list.every((workout) => workoutSchema.shape.startTime.safeParse(workout.startTime).success),
    ).toBe(true);
    expect(list[0]!.startTime).toBeGreaterThan(list[1]!.startTime);

    const page = (await (
      await h.get(`/workouts?before=${list[0]!.startTime}`)
    ).json()) as Workout[];
    expect(page.map((row) => row.id)).toEqual([old!.id]);
  });
});

describe("POST /workouts/:id/finish", () => {
  it("sets status completed + endTime once, then refuses twice", async () => {
    const current = (await (await h.get(`/workouts/${activeId}`)).json()) as Workout;
    const res = await h.send("POST", `/workouts/${activeId}/finish`, {
      expectedUpdatedAt: current.updatedAt,
    });
    expect(res.status).toBe(200);
    const finished = workoutSchema.parse(await res.json());
    expect(finished.status).toBe("completed");
    expect(finished.endTime).not.toBeNull();

    // the slot is free again: GET active → null
    expect(await (await h.get("/workouts/active")).json()).toBeNull();

    const again = await h.send("POST", `/workouts/${activeId}/finish`, {
      expectedUpdatedAt: finished.updatedAt,
    });
    expect(again.status).toBe(409);
  });
});

describe("DELETE /workouts/:id", () => {
  it("removes a completed workout (204, children cascaded)", async () => {
    const exerciseId = await createLibraryExercise(h.db, "Delete Cascade Ex");
    const [old] = await h.db
      .insert(workouts)
      .values({ userId: OWNER_USER_ID, status: "completed" })
      .returning();
    await h.db.insert(workoutEntries).values({ workoutId: old!.id, exerciseId });

    const res = await h.send("DELETE", `/workouts/${old!.id}`);
    expect(res.status).toBe(204);
    expect(
      await h.db.select().from(workoutEntries).where(eq(workoutEntries.workoutId, old!.id)),
    ).toEqual([]);
  });

  it("404s a missing workout", async () => {
    const res = await h.send("DELETE", `/workouts/${uuid()}`);
    expect(res.status).toBe(404);
  });
});
