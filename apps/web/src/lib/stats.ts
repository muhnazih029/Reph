import type { Workout, WorkoutSet } from "@reph/contracts";

// Pure progression math — docs/plans/phase-1-mvp.md (Core Interfaces).
// Canonical storage is kg; stats never touch display units.

/** Epley 1RM estimate. A single rep IS the 1RM (no rounding inflation). */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** The performed set with the highest Epley estimate (not the max weight). */
export function bestSetByEpley(sets: WorkoutSet[]): {
  weightKg: number;
  reps: number;
  oneRM: number;
} | null {
  let best: { weightKg: number; reps: number; oneRM: number } | null = null;
  for (const set of sets) {
    if (set.weightKg === null || set.reps === null || set.reps === 0) continue;
    const oneRM = estimate1RM(set.weightKg, set.reps);
    if (!best || oneRM > best.oneRM) best = { weightKg: set.weightKg, reps: set.reps, oneRM };
  }
  return best;
}

/** Sum of `weight × reps` over done strength sets — warm-ups excluded;
 * cardio sets have no weight and drop out naturally. */
export function workoutVolumeKg(workout: Workout): number {
  let volume = 0;
  for (const entry of workout.entries) {
    for (const set of entry.sets) {
      if (set.done && set.type !== "warmup" && set.weightKg !== null && set.reps !== null) {
        volume += set.weightKg * set.reps;
      }
    }
  }
  return volume;
}

/** Monday 00:00 (local) of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** The `weeks` most recent local weeks (ending this week), ascending, with
 * the sum of workout volume (completed workouts only) bucketed into each. */
export function weeklyVolumeSeries(
  workouts: Workout[],
  weeks: number,
): Array<{ weekStart: number; volumeKg: number }> {
  const weekStarts: Array<{ weekStart: number; volumeKg: number }> = [];
  const currentMonday = startOfWeek(new Date());
  for (let offset = weeks - 1; offset >= 0; offset--) {
    const monday = new Date(currentMonday);
    monday.setDate(monday.getDate() - offset * 7);
    weekStarts.push({ weekStart: monday.getTime(), volumeKg: 0 });
  }

  for (const workout of workouts) {
    if (workout.status !== "completed") continue;
    const monday = startOfWeek(new Date(workout.startTime)).getTime();
    const bucket = weekStarts.find((week) => week.weekStart === monday);
    if (bucket) bucket.volumeKg += workoutVolumeKg(workout);
  }
  return weekStarts;
}

/** Most recent done set (any set type) recorded for an exercise, across
 * workouts ordered newest-first. Null when the exercise was never performed. */
export function previousPerformance(
  workouts: Workout[],
  exerciseId: string,
): { weightKg: number; reps: number; rpe: number | null } | null {
  const sorted = [...workouts].toSorted((a, b) => b.startTime - a.startTime);
  for (const workout of sorted) {
    for (const entry of workout.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      // positions are not sorted across edits — pick the latest position done
      const doneSets = entry.sets.filter(
        (set) => set.done && set.weightKg !== null && set.reps !== null,
      );
      const last = doneSets.at(-1);
      if (last) {
        return { weightKg: last.weightKg!, reps: last.reps!, rpe: last.rpe };
      }
    }
  }
  return null;
}
