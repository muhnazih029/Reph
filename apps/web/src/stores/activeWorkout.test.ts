import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Workout, WorkoutSet } from "@reph/contracts";

const EX_A = crypto.randomUUID();
const EX_B = crypto.randomUUID();

// Task 8 gate — store contracts from docs/plans/phase-1-mvp.md (Core
// Interfaces). The transport (api/client) and the query cache
// (api/queryClient) are mocked with an in-memory server long enough to
// exercise the 409/optimistic-rollback paths.

let active: Workout | null = null;
let staleExpectedUpdatedAt = false; // forces the next PATCH to 409
const invalidated: unknown[] = [];

class MockApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const receivedPatches: Array<Record<string, unknown>> = [];

mock.module("../api/client", () => ({
  ApiError: MockApiError,
  apiGet: async (path: string) => {
    if (path === "/workouts/active") return clone(active);
    throw new MockApiError("bad_request", 400, `unexpected GET ${path}`);
  },
  apiSend: async (
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    path: string,
    body: Record<string, unknown> | undefined,
  ) => {
    if (method === "POST" && path === "/workouts") {
      if (active) throw new MockApiError("conflict", 409, "already active");
      active = {
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        title: (body?.title as string | undefined) ?? "",
        notes: "",
        status: "active",
        startTime: Date.now(),
        endTime: null,
        bodyWeightKg: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        entries: [],
      };
      return clone(active);
    }
    if (method === "PATCH" && /^\/workouts\/[0-9a-f-]+$/.test(path)) {
      receivedPatches.push(clone(body ?? {}));
      if (staleExpectedUpdatedAt) {
        staleExpectedUpdatedAt = false;
        throw new MockApiError("conflict", 409, "stale");
      }
      if (!active) throw new MockApiError("not_found", 404, "gone");
      if (body?.expectedUpdatedAt !== (active as Workout).updatedAt) {
        throw new MockApiError("conflict", 409, "stale");
      }
      active = {
        ...(active as Workout),
        title: (body?.title as string) ?? (active as Workout).title,
        notes: (body?.notes as string) ?? (active as Workout).notes,
        bodyWeightKg: (body?.bodyWeightKg as number | null) ?? null,
        entries: clone((body?.entries ?? []) as Workout["entries"]),
        updatedAt: Date.now() + 1,
      };
      return clone(active);
    }
    if (method === "POST" && path.endsWith("/finish")) {
      if (!active) throw new MockApiError("not_found", 404, "gone");
      if (body?.expectedUpdatedAt !== (active as Workout).updatedAt) {
        throw new MockApiError("conflict", 409, "stale");
      }
      active = {
        ...(active as Workout),
        status: "completed",
        endTime: Date.now(),
        updatedAt: Date.now() + 2,
      };
      const finished = clone(active) as Workout;
      active = null;
      return finished;
    }
    if (method === "DELETE" && /^\/workouts\/[0-9a-f-]+$/.test(path)) {
      active = null;
      return undefined as never;
    }
    throw new MockApiError("bad_request", 400, `unexpected ${method} ${path}`);
  },
}));

mock.module("../api/queryClient", () => ({
  queryClient: {
    invalidateQueries: (options: unknown) => {
      invalidated.push(options);
    },
  },
}));

const { useActiveWorkoutStore } = await import("./activeWorkout");

const store = () => useActiveWorkoutStore.getState();
const reset = () => {
  active = null;
  staleExpectedUpdatedAt = false;
  invalidated.length = 0;
  receivedPatches.length = 0;
  useActiveWorkoutStore.setState({ workout: null });
};

beforeEach(reset);

describe("hydrate", () => {
  it("restores the active row as mirror", async () => {
    await store().startWorkout();
    useActiveWorkoutStore.setState({ workout: null }); // simulate cold boot
    await store().hydrate();
    expect(store().workout?.status).toBe("active");
  });

  it("clears the mirror when no workout is active", async () => {
    useActiveWorkoutStore.setState({
      workout: {
        id: "stale",
        userId: "u",
        title: "",
        notes: "",
        status: "active",
        startTime: 1,
        endTime: null,
        bodyWeightKg: null,
        createdAt: 1,
        updatedAt: 1,
        entries: [],
      },
    });
    await store().hydrate();
    expect(store().workout).toBeNull();
  });
});

describe("startWorkout", () => {
  it("posts and mirrors an active workout", async () => {
    await store().startWorkout("Push day");
    const workout = store().workout;
    expect(workout).not.toBeNull();
    expect(workout?.status).toBe("active");
    expect(workout?.title).toBe("Push day");
  });

  it("adopts the server mirror on a second start (409 → hydrate)", async () => {
    await store().startWorkout("first");
    const firstMirror = store().workout;
    await store().startWorkout("second"); // API 409s; store should hydrate
    expect(store().workout?.id).toBe(firstMirror?.id);
  });
});

describe("entry + set mutations", () => {
  beforeEach(async () => {
    await store().startWorkout();
  });

  it("addExercise appends with position = n and one empty normal set", async () => {
    await store().addExercise(EX_A);
    await store().addExercise(EX_B);
    const entries = store().workout?.entries ?? [];
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.position)).toEqual([0, 1]);
    expect(entries[1]?.sets).toHaveLength(1);
    expect(entries[1]?.sets[0]).toMatchObject({
      type: "normal",
      weightKg: null,
      reps: null,
      done: false,
    });
  });

  it("addSet appends after the existing sets (position order stable)", async () => {
    await store().addExercise(EX_A);
    const entry = store().workout?.entries[0];
    await store().addSet(entry!.id, "warmup");
    const sets = store().workout?.entries[0]?.sets ?? [];
    expect(sets.map((s: WorkoutSet) => s.type)).toEqual([
      "normal",
      "warmup",
    ] as WorkoutSet["type"][]);
    expect(sets[1]?.position).toBe(1);
  });

  it("updateSet patches the set optimistically and rolls back on 409", async () => {
    await store().addExercise(EX_A);
    const entry = store().workout?.entries[0];
    const setId = entry!.sets[0]!.id;

    await store().updateSet(entry!.id, setId, { weightKg: 95, reps: 3, done: true });
    expect(store().workout?.entries[0]?.sets[0]).toMatchObject({
      weightKg: 95,
      reps: 3,
      done: true,
    });

    staleExpectedUpdatedAt = true;
    await store()
      .updateSet(entry!.id, setId, { weightKg: 120 })
      .catch(() => undefined);
    // the failed optimistic change rolls back to the last server state
    expect(store().workout?.entries[0]?.sets[0]).toMatchObject({
      weightKg: 95,
      reps: 3,
      done: true,
    });
  });

  it("removeSet removes and re-stabilises positions", async () => {
    await store().addExercise(EX_A);
    const entry = store().workout?.entries[0];
    await store().addSet(entry!.id);
    const secondId = store().workout?.entries[0]?.sets[1]!.id;
    await store().removeSet(entry!.id, secondId!);
    const sets = store().workout?.entries[0]?.sets ?? [];
    expect(sets).toHaveLength(1);
    expect(sets[0]?.position).toBe(0);
  });

  it("removeEntry drops the entry and closes position gaps", async () => {
    await store().addExercise(EX_A);
    await store().addExercise(EX_B);
    const firstId = store().workout?.entries[0]!.id;
    await store().removeEntry(firstId!);
    const entries = store().workout?.entries ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.position).toBe(0);
    expect(store().workout?.entries[0]?.exerciseId).toBe(EX_B);
  });

  it("moveEntry swaps positions with the neighbour", async () => {
    await store().addExercise(EX_A);
    await store().addExercise(EX_B);
    const firstId = store().workout?.entries[0]!.id;
    await store().moveEntry(firstId!, 1);
    const entries = store().workout?.entries ?? [];
    expect(entries.map((e) => e.exerciseId)).toEqual([EX_B, EX_A]);
    expect(entries.map((e) => e.position)).toEqual([0, 1]);
  });

  it("setEntryNotes patches the entry notes", async () => {
    await store().addExercise(EX_A);
    const entryId = store().workout?.entries[0]!.id;
    await store().setEntryNotes(entryId!, "lighter today");
    expect(store().workout?.entries[0]?.notes).toBe("lighter today");
  });

  it("toggleSuperset assigns one shared id, second toggle clears both", async () => {
    await store().addExercise(EX_A);
    await store().addExercise(EX_B);
    const [aId, bId] = (store().workout?.entries ?? []).map((e) => e.id);

    await store().toggleSuperset(aId!, bId!);
    const pair = store().workout?.entries ?? [];
    expect(pair[0]?.supersetId).not.toBeNull();
    expect(pair[0]?.supersetId).toBe(pair[1]?.supersetId);
    const shared = pair[0]?.supersetId;

    await store().toggleSuperset(aId!, bId!);
    const cleared = store().workout?.entries ?? [];
    expect(cleared[0]?.supersetId).toBeNull();
    expect(cleared[1]?.supersetId).toBeNull();

    // superset id churn: first toggle used a fresh id, not later cleared one
    expect(shared).toBeTruthy();
  });

  it("setTitle and setBodyWeight patch workout fields", async () => {
    await store().setTitle("Pull day");
    await store().setBodyWeight(82.5);
    expect(store().workout?.title).toBe("Pull day");
    expect(store().workout?.bodyWeightKg).toBe(82.5);
  });
});

describe("lifecycle", () => {
  it("finishWorkout clears the mirror, returns the id, invalidates list queries", async () => {
    await store().startWorkout();
    const title = store().workout?.title;
    void title;
    const id = await store().finishWorkout();
    expect(store().workout).toBeNull();
    expect(id).toBeTruthy();
    expect(invalidated.length).toBeGreaterThan(0);
    expect(
      invalidated.some((option) =>
        (option as { predicate: (q: { queryKey: string[] }) => boolean }).predicate({
          queryKey: ["workouts"],
        }),
      ),
    ).toBe(true);
  });

  it("discardWorkout deletes and clears the mirror", async () => {
    await store().startWorkout();
    const id = store().workout?.id;
    await store().discardWorkout();
    expect(store().workout).toBeNull();
    expect(active).toBeNull();
    expect(id).toBeTruthy();
  });
});
