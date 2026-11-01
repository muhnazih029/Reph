import type { SetType, Workout, WorkoutEntry, WorkoutSet } from "@reph/contracts";
import {
  createWorkoutRequestSchema,
  finishWorkoutRequestSchema,
  updateWorkoutRequestSchema,
  workoutSchema,
} from "@reph/contracts";
import { z } from "zod";
import { create } from "zustand";
import type { ApiError } from "../api/client";
import { apiGet, apiSend } from "../api/client";
import { queryClient } from "../api/queryClient";
import { newId } from "../lib/id";

// Server-backed active-workout store — the single owner of the in-session
// workout (docs/plans/phase-1-mvp.md, Core Interfaces → Active workout
// store). Online-first: every mutation PATCHes the full nested payload and
// the mirror adopts the server response; `updateSet` alone is optimistic
// with rollback. Entry/set ids are client-side UUIDs so simultaneous
// mirrors of the same PATCH are idempotent (PRD-API §3).

export interface ActiveWorkoutState {
  workout: Workout | null;
  hydrate(): Promise<void>;
  startWorkout(title?: string): Promise<void>; // 409 → hydrate (ADOPTS row)
  addExercise(exerciseId: string): Promise<void>; // appends entry + 1 empty normal set
  removeEntry(entryId: string): Promise<void>;
  addSet(entryId: string, type?: SetType): Promise<void>;
  updateSet(entryId: string, setId: string, patch: Partial<WorkoutSet>): Promise<void>;
  removeSet(entryId: string, setId: string): Promise<void>;
  moveEntry(entryId: string, direction: -1 | 1): Promise<void>;
  setEntryNotes(entryId: string, notes: string): Promise<void>;
  toggleSuperset(entryId: string, otherEntryId: string): Promise<void>;
  setTitle(title: string): Promise<void>;
  setNotes(notes: string): Promise<void>;
  setBodyWeight(kg: number | null): Promise<void>;
  finishWorkout(): Promise<string>;
  discardWorkout(): Promise<void>;
}

/** Positions are re-stabilised to 0..n-1 after every structure change. */
function withStablePositions(entries: WorkoutEntry[]): WorkoutEntry[] {
  return entries.map((entry, position) => ({
    ...entry,
    position,
    sets: entry.sets.map((set, index) => ({ ...set, position: index })),
  }));
}

/** Active-mirror PATCH body: the full nested payload + the 409 guard. */
function buildPayload(workout: Workout): unknown {
  return updateWorkoutRequestSchema.parse({
    expectedUpdatedAt: workout.updatedAt,
    title: workout.title,
    notes: workout.notes,
    bodyWeightKg: workout.bodyWeightKg,
    entries: withStablePositions(workout.entries),
  });
}

function invalidateList() {
  void queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === "workouts",
  });
}

function emptySet(type: SetType): WorkoutSet {
  return {
    id: newId(),
    type,
    weightKg: null,
    reps: null,
    rpe: null,
    durationSeconds: null,
    distanceMeters: null,
    calories: null,
    done: false,
    position: 0,
  };
}

export const useActiveWorkoutStore = create<ActiveWorkoutState>()((set, get) => {
  const requireWorkout = (): Workout => {
    const workout = get().workout;
    if (!workout) throw new Error("no active workout");
    return workout;
  };

  /** Full nested replace via PATCH; the mirror adopts the server response. */
  const commit = async (mutate: (workout: Workout) => void): Promise<void> => {
    const workout = requireWorkout();
    const draft = structuredClone(workout);
    mutate(draft);
    const next = await apiSend(
      "PATCH",
      `/workouts/${workout.id}`,
      updateWorkoutRequestSchema.parse({
        expectedUpdatedAt: workout.updatedAt,
        title: draft.title,
        notes: draft.notes,
        bodyWeightKg: draft.bodyWeightKg,
        entries: withStablePositions(draft.entries),
      }),
      workoutSchema,
    );
    set({ workout: next });
    invalidateList();
  };

  return {
    workout: null,

    hydrate: async () => {
      const workout = await apiGet("/workouts/active", workoutSchema.nullable());
      set({ workout });
    },

    startWorkout: async (title?: string) => {
      if (get().workout) return;
      try {
        const workout = await apiSend(
          "POST",
          "/workouts",
          createWorkoutRequestSchema.parse({ title }),
          workoutSchema,
        );
        set({ workout });
      } catch (error) {
        // one slot per user: adopt the already-active row
        if ((error as ApiError).status === 409) {
          await get().hydrate();
          return;
        }
        throw error;
      }
    },

    addExercise: (exerciseId) =>
      commit((workout) => {
        workout.entries.push({
          id: newId(),
          exerciseId,
          notes: "",
          supersetId: null,
          position: workout.entries.length,
          sets: [emptySet("normal")],
        });
      }),

    removeEntry: (entryId) =>
      commit((workout) => {
        workout.entries = workout.entries.filter((entry) => entry.id !== entryId);
      }),

    addSet: (entryId, type = "normal") =>
      commit((workout) => {
        const entry = workout.entries.find((candidate) => candidate.id === entryId);
        if (!entry) throw new Error("entry not found");
        entry.sets.push(emptySet(type));
      }),

    updateSet: async (entryId, setId, patch) => {
      const previous = requireWorkout();
      // optimistic mirror — the UI sees the value immediately, rollback on 409
      const optimistic = structuredClone(previous);
      const entry = optimistic.entries.find((candidate) => candidate.id === entryId);
      const target = entry?.sets.find((candidate) => candidate.id === setId);
      if (!target) throw new Error("set not found");
      Object.assign(target, patch);
      set({ workout: optimistic });

      try {
        const next = await apiSend(
          "PATCH",
          `/workouts/${previous.id}`,
          buildPayload(optimistic),
          workoutSchema,
        );
        set({ workout: next });
        invalidateList();
      } catch (error) {
        set({ workout: previous });
        throw error;
      }
    },

    removeSet: (entryId, setId) =>
      commit((workout) => {
        const entry = workout.entries.find((candidate) => candidate.id === entryId);
        if (!entry) throw new Error("entry not found");
        entry.sets = entry.sets.filter((candidate) => candidate.id !== setId);
      }),

    moveEntry: (entryId, direction) =>
      commit((workout) => {
        const index = workout.entries.findIndex((candidate) => candidate.id === entryId);
        const next = index + direction;
        if (index < 0 || next < 0 || next >= workout.entries.length) return;
        const [moved] = workout.entries.splice(index, 1);
        workout.entries.splice(next, 0, moved as WorkoutEntry);
      }),

    setEntryNotes: (entryId, notes) =>
      commit((workout) => {
        const entry = workout.entries.find((candidate) => candidate.id === entryId);
        if (!entry) throw new Error("entry not found");
        entry.notes = notes;
      }),

    toggleSuperset: (entryId, otherEntryId) =>
      commit((workout) => {
        const a = workout.entries.find((candidate) => candidate.id === entryId);
        const b = workout.entries.find((candidate) => candidate.id === otherEntryId);
        if (!a || !b) throw new Error("entries not found");
        if (a.supersetId !== null && a.supersetId === b.supersetId) {
          a.supersetId = null;
          b.supersetId = null;
        } else {
          const supersetId = newId();
          a.supersetId = supersetId;
          b.supersetId = supersetId;
        }
      }),

    setTitle: (title) => commit((workout) => (workout.title = title)),

    setNotes: (notes) => commit((workout) => (workout.notes = notes)),

    setBodyWeight: (kg) => commit((workout) => (workout.bodyWeightKg = kg)),

    finishWorkout: async () => {
      const workout = requireWorkout();
      const finished = await apiSend(
        "POST",
        `/workouts/${workout.id}/finish`,
        finishWorkoutRequestSchema.parse({ expectedUpdatedAt: workout.updatedAt }),
        workoutSchema,
      );
      set({ workout: null });
      invalidateList();
      return finished.id;
    },

    discardWorkout: async () => {
      const workout = requireWorkout();
      await apiSend("DELETE", `/workouts/${workout.id}`, undefined, z.void());
      set({ workout: null });
      invalidateList();
    },
  };
});
