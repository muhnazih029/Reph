import { describe, expect, it } from "bun:test";
import type { Workout, WorkoutEntry, WorkoutSet } from "@reph/contracts";
import { newId } from "./id";
import {
  bestSetByEpley,
  estimate1RM,
  previousPerformance,
  weeklyVolumeSeries,
  workoutVolumeKg,
} from "./stats";

// Phase 1 Task 6 gate — docs/plans/phase-1-mvp.md (Core Interfaces).

const uuid = () => crypto.randomUUID();

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: newId(),
  type: "normal",
  weightKg: 100,
  reps: 5,
  rpe: 8,
  durationSeconds: null,
  distanceMeters: null,
  calories: null,
  done: true,
  position: 0,
  ...overrides,
});

const entry = (exerciseId: string, sets: WorkoutSet[]): WorkoutEntry => ({
  id: newId(),
  exerciseId,
  notes: "",
  supersetId: null,
  position: 0,
  sets,
});

const workout = (overrides: Partial<Workout> & { entries: WorkoutEntry[] }): Workout => ({
  id: uuid(),
  userId: uuid(),
  title: "",
  notes: "",
  status: "completed",
  startTime: Date.now(),
  endTime: Date.now(),
  bodyWeightKg: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe("estimate1RM", () => {
  it("Epley for 100×5 ≈ 116.67", () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.6667, 4);
  });

  it("a single rep is the 1RM", () => {
    expect(estimate1RM(120, 1)).toBe(120);
  });
});

describe("bestSetByEpley", () => {
  it("picks the highest Epley, not the max weight", () => {
    // Epley(140,1)=140 beats Epley(100,5)=116.67 — a single IS the 1RM
    const result = bestSetByEpley([
      set({ weightKg: 140, reps: 1 }),
      set({ weightKg: 100, reps: 5, position: 1 }),
    ]);
    expect(result?.weightKg).toBe(140);
    expect(result?.oneRM).toBe(140);
  });

  it("prefers a multi-rep set when its Epley beats a heavier single", () => {
    const result = bestSetByEpley([
      set({ weightKg: 100, reps: 1 }),
      set({ weightKg: 90, reps: 5, position: 1 }),
    ]);
    expect(result?.weightKg).toBe(90);
    expect(result?.oneRM).toBeCloseTo(105, 4); // 90 × (1 + 5/30)
  });

  it("returns null on empty or all-cardio input", () => {
    expect(bestSetByEpley([])).toBeNull();
    expect(bestSetByEpley([set({ weightKg: null, reps: null })])).toBeNull();
  });
});

describe("workoutVolumeKg", () => {
  it("counts done strength sets only, warmups excluded", () => {
    const w = workout({
      entries: [
        entry(uuid(), [
          set({ weightKg: 80, reps: 5 }), // 400
          set({ type: "warmup", weightKg: 40, reps: 8, position: 1 }), // excluded
          set({ weightKg: 60, reps: 10, done: false, position: 2 }), // not done
          set({ type: "drop", weightKg: 50, reps: 5, position: 3 }), // 250
        ]),
        entry(uuid(), [set({ weightKg: null, reps: null, durationSeconds: 600 })]), // cardio
      ],
    });
    expect(workoutVolumeKg(w)).toBe(650);
  });
});

describe("weeklyVolumeSeries", () => {
  it("buckets by local Monday ascending across N weeks", () => {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const thisWeek = monday.getTime();
    const lastWeek = thisWeek - 7 * 86_400_000;

    const w = workout({
      startTime: thisWeek + 3_600_000,
      entries: [entry(uuid(), [set({ weightKg: 100, reps: 5 })])],
    });
    const series = weeklyVolumeSeries([w], 2);
    expect(series.map((bucket) => bucket.weekStart)).toEqual([lastWeek, thisWeek]);
    expect(series[1]?.volumeKg).toBe(500);
    expect(series[0]?.volumeKg).toBe(0);
  });
});

describe("previousPerformance", () => {
  it("returns the most recent done set's triple", () => {
    const exerciseId = uuid();
    const older = workout({
      startTime: now() - 3 * 86_400_000,
      entries: [entry(exerciseId, [set({ weightKg: 90, reps: 5, rpe: 7.5 })])],
    });
    const newer = workout({
      startTime: now() - 86_400_000,
      entries: [entry(exerciseId, [set({ weightKg: 95, reps: 3, rpe: 9, position: 1 })])],
    });
    const result = previousPerformance([older, newer], exerciseId);
    expect(result).toEqual({ weightKg: 95, reps: 3, rpe: 9 });
  });

  it("returns null when the exercise was never performed", () => {
    expect(previousPerformance([], uuid())).toBeNull();
  });
});

function now(): number {
  return Date.now();
}
