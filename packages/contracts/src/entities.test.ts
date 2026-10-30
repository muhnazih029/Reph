import { describe, expect, it } from "bun:test";
import {
  apiErrorSchema,
  createExerciseRequestSchema,
  exerciseSchema,
  updateWorkoutRequestSchema,
  workoutSchema,
} from "./index";

// Phase 1 Task 2 gate (docs/plans/phase-1-mvp.md) — the normative examples
// come from docs/specs/contracts.md §1–§4.

const now = 1_798_000_000_000;

const uuid = () => crypto.randomUUID();

// Valid fixture builders (fresh UUID per call — see docs/specs/contracts.md §1–§2).

const validExercise = () => ({
  id: uuid(),
  userId: null,
  name: "Barbell Bench Press",
  muscleGroup: "chest" as const,
  equipment: "barbell" as const,
  type: "strength" as const,
  isCustom: false,
  createdAt: now,
});

describe("exerciseSchema", () => {
  it("parses a valid seeded-library exercise", () => {
    expect(exerciseSchema.parse(validExercise()).name).toBe("Barbell Bench Press");
  });

  it("rejects a non-UUID id", () => {
    const bad = { ...validExercise(), id: "not-a-uuid" };
    expect(() => exerciseSchema.parse(bad)).toThrow();
  });
});

const validWorkoutSet = (position: number) => ({
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
});

const validWorkoutEntry = (position: number, sets: number) => ({
  id: uuid(),
  exerciseId: uuid(),
  notes: "",
  supersetId: null,
  position,
  sets: Array.from({ length: sets }, (_, i) => validWorkoutSet(i)),
});

const validWorkout = () => ({
  id: uuid(),
  userId: uuid(),
  title: "Push day",
  notes: "",
  status: "active" as const,
  startTime: now,
  endTime: null,
  bodyWeightKg: null,
  entries: [validWorkoutEntry(0, 2), validWorkoutEntry(1, 1)],
  createdAt: now,
  updatedAt: now,
});

describe("workoutSchema", () => {
  it("parses a full workout with 2 nested entries and sets", () => {
    const result = workoutSchema.parse(validWorkout());
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.sets).toHaveLength(2);
    expect(result.entries[1]?.sets).toHaveLength(1);
  });

  it("rejects rpe above 10", () => {
    const bad = validWorkout();
    const firstEntry = bad.entries[0];
    if (firstEntry) firstEntry.sets[0] = { ...firstEntry.sets[0]!, rpe: 11 };
    expect(() => workoutSchema.parse(bad)).toThrow();
  });

  it("rejects negative weight", () => {
    const bad = validWorkout();
    const firstEntry = bad.entries[0];
    if (firstEntry) firstEntry.sets[0] = { ...firstEntry.sets[0]!, weightKg: -1 };
    expect(() => workoutSchema.parse(bad)).toThrow();
  });

  it("rejects a non-UUID id", () => {
    const bad = validWorkout();
    (bad as Record<string, unknown>).id = "not-a-uuid";
    expect(() => workoutSchema.parse(bad)).toThrow();
  });
});

describe("createExerciseRequestSchema", () => {
  it("accepts a body without server-managed fields", () => {
    const result = createExerciseRequestSchema.parse({
      name: "Incline DB Press",
      muscleGroup: "chest",
      equipment: "dumbbell",
      type: "strength",
    });
    expect(result.name).toBe("Incline DB Press");
  });
});

describe("updateWorkoutRequestSchema", () => {
  it("accepts a partial body with expectedUpdatedAt", () => {
    expect(
      updateWorkoutRequestSchema.parse({ expectedUpdatedAt: now, notes: "felt strong" }),
    ).toMatchObject({ notes: "felt strong" });
  });

  it("rejects a body without expectedUpdatedAt", () => {
    expect(() => updateWorkoutRequestSchema.parse({ title: "no guard" })).toThrow();
  });
});

describe("apiErrorSchema", () => {
  it("accepts the documented envelope", () => {
    const envelope = {
      error: { code: "not_found", message: "Workout not found", details: {} },
    };
    expect(apiErrorSchema.parse(envelope).error.code).toBe("not_found");
  });

  it("rejects an unknown code", () => {
    expect(() => apiErrorSchema.parse({ error: { code: "teapot", message: "nope" } })).toThrow();
  });
});
