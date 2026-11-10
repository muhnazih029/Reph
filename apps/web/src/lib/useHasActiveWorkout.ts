import { useActiveWorkout } from "../api/hooks";
import { useActiveWorkoutStore } from "../stores/activeWorkout";
import type { Workout } from "@reph/contracts";

// The running workout, from whichever source knows about it first: the
// store (the mirror — it changes the instant a workout starts, finishes
// or is discarded) or the query (a workout that was already running on
// the server, e.g. when the app opens straight into Home).

export function useActiveWorkoutSummary(): Workout | null {
  const stored = useActiveWorkoutStore((state) => state.workout);
  const remote = useActiveWorkout();
  return stored ?? remote.data ?? null;
}

/** Is a workout running right now? */
export function useHasActiveWorkout(): boolean {
  return useActiveWorkoutSummary() !== null;
}
