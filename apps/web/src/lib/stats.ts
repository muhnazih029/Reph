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

// ── Stats screen aggregations (all client-side, canonical kg) ─────────

export type StatsPeriod = "30d" | "90d" | "1y" | "all";
export const STATS_PERIODS: readonly StatsPeriod[] = ["30d", "90d", "1y", "all"];

/** Epoch seconds-ms of the first day included in a period; null = no filter. */
export function periodStart(period: StatsPeriod, now: number = Date.now()): number | null {
  const DAY = 86_400_000;
  switch (period) {
    case "30d":
      return now - 30 * DAY;
    case "90d":
      return now - 90 * DAY;
    case "1y":
      return now - 365 * DAY;
    case "all":
      return null;
  }
}

/** Completed workouts at or after `since`, ascending by startTime. */
export function completedSince(workouts: Workout[], since: number | null): Workout[] {
  return workouts
    .filter((workout) => workout.status === "completed")
    .filter((workout) => since === null || workout.startTime >= since)
    .toSorted((a, b) => a.startTime - b.startTime);
}

/** Σ(weight × reps) of done, non-warmup strength sets, grouped by the
 * exercise's muscle group. Descending by volume; empty groups omitted. */
export function volumeByMuscleGroup(
  workouts: Workout[],
  exerciseMuscleGroup: (id: string) => string,
): Array<{ muscleGroup: string; volumeKg: number }> {
  const volumes = new Map<string, number>();
  for (const workout of workouts) {
    for (const entry of workout.entries) {
      const group = exerciseMuscleGroup(entry.exerciseId);
      for (const set of entry.sets) {
        if (set.done && set.type !== "warmup" && set.weightKg !== null && set.reps !== null) {
          volumes.set(group, (volumes.get(group) ?? 0) + set.weightKg * set.reps);
        }
      }
    }
  }
  return [...volumes.entries()]
    .map(([muscleGroup, volumeKg]) => ({ muscleGroup, volumeKg }))
    .toSorted((a, b) => b.volumeKg - a.volumeKg);
}

/** One e1RM point per workout that performed the exercise (best set by
 * Epley). Ascending — ready for a line chart. */
export function strengthSeries(
  workouts: Workout[],
  exerciseId: string,
): Array<{ time: number; oneRM: number }> {
  const series: Array<{ time: number; oneRM: number }> = [];
  for (const workout of completedSince(workouts, null)) {
    for (const entry of workout.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      const best = bestSetByEpley(entry.sets);
      if (best) series.push({ time: workout.startTime, oneRM: best.oneRM });
    }
  }
  return series;
}

/** The exercise logged in the most workouts (ties broken by total sets). */
export function mostPerformedExercise(workouts: Workout[]): string | null {
  const workoutCount = new Map<string, number>();
  const setCount = new Map<string, number>();
  for (const workout of workouts) {
    const seen = new Set<string>();
    for (const entry of workout.entries) {
      if (!seen.has(entry.exerciseId)) {
        seen.add(entry.exerciseId);
        workoutCount.set(entry.exerciseId, (workoutCount.get(entry.exerciseId) ?? 0) + 1);
      }
      const doneSets = entry.sets.filter((set) => set.done).length;
      setCount.set(entry.exerciseId, (setCount.get(entry.exerciseId) ?? 0) + doneSets);
    }
  }
  return (
    [...workoutCount.entries()].toSorted(
      (a, b) => b[1] - a[1] || (setCount.get(b[0]) ?? 0) - (setCount.get(a[0]) ?? 0),
    )[0]?.[0] ?? null
  );
}
