import type { Workout } from "@reph/contracts";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import {
  useActiveWorkout,
  useCreateWorkout,
  useExercises,
  useSettings,
  useWorkouts,
  usePhotos,
} from "../api/hooks";
import { bestSetByEpley, estimate1RM, weeklyVolumeSeries } from "../lib/stats";
import { displayWeight } from "../lib/units";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { WorkoutRow } from "../components/history/WorkoutRow";

// Today home — greeting + date, the primary Start/Resume CTA, a this-week
// summary strip (completed workouts, volume, sets), up to three recent
// personal records across the last 20 completed workouts (Epley 1RM per
// exercise), and the five most recent workouts (Task 11).

type Pr = { exerciseId: string; weightKg: number; reps: number; rpe: number | null };

/** Best Epley set per exercise across the newest-first workouts, top N. */
function recentPrs(workouts: Workout[], max = 3): Pr[] {
  const best = new Map<string, { weightKg: number; reps: number; rpe: number | null }>();
  for (const workout of workouts.slice(0, 20)) {
    for (const entry of workout.entries) {
      const candidate = bestSetByEpley(entry.sets);
      if (!candidate) continue;
      const existing = best.get(entry.exerciseId);
      if (!existing || candidate.oneRM > estimate1RM(existing.weightKg, existing.reps)) {
        best.set(entry.exerciseId, {
          weightKg: candidate.weightKg,
          reps: candidate.reps,
          rpe:
            entry.sets.find(
              (set) =>
                set.done && set.weightKg === candidate.weightKg && set.reps === candidate.reps,
            )?.rpe ?? null,
        });
      }
    }
  }
  return Array.from(best.entries())
    .slice(0, max)
    .map(([exerciseId, pr]) => ({ exerciseId, ...pr }));
}

function isThisWeek(workout: Workout): boolean {
  const start = new Date(workout.startTime);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  now.setHours(0, 0, 0, 0);
  return start.getTime() === now.getTime();
}

export function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const active = useActiveWorkout();
  const workouts = useWorkouts(20);
  const exercises = useExercises();
  const settings = useSettings();
  const create = useCreateWorkout();
  const [starting, setStarting] = useState(false);

  const photos = usePhotos(6);

  const completed = useMemo(
    () => (workouts.data ?? []).filter((workout) => workout.status === "completed"),
    [workouts.data],
  );
  const week = weeklyVolumeSeries(completed, 1).at(-1);
  const thisWeek = useMemo(() => completed.filter(isThisWeek), [completed]);
  const weekSets = thisWeek.reduce(
    (count, workout) =>
      count +
      workout.entries.reduce((sum, entry) => sum + entry.sets.filter((set) => set.done).length, 0),
    0,
  );
  const prs = useMemo(() => recentPrs(completed), [completed]);
  const recent = completed.slice(0, 5);

  const exerciseName = (id: string): string =>
    exercises.data?.find((exercise) => exercise.id === id)?.name ?? t("common.loading");

  const start = async () => {
    setStarting(true);
    try {
      if (!active.data) await create.mutateAsync({});
      await router.navigate({ to: "/workout/active" });
    } finally {
      setStarting(false);
    }
  };

  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-3">
      <div>
        <h2 id="today-title" className="text-xl font-medium">
          {t("today.greeting")}
        </h2>
        <p className="text-sm text-text-muted">{format(Date.now(), "EEEE, d MMMM")}</p>
      </div>

      <Button
        className="min-h-12 w-full text-base"
        disabled={starting || workouts.isPending || active.isPending}
        onClick={() => void start()}
      >
        {active.data ? t("today.resume") : t("today.startWorkout")}
      </Button>

      {workouts.isPending || active.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : completed.length === 0 && !active.data ? (
        <EmptyState title={t("history.empty")} body={t("today.firstRunBody")} />
      ) : (
        <>
          <Card className="grid grid-cols-3 divide-x divide-border py-2 text-center">
            <div className="px-1 py-1">
              <p className="numeric text-base">{thisWeek.length}</p>
              <p className="text-xs text-text-muted">{t("today.weekWorkouts")}</p>
            </div>
            <div className="px-1 py-1">
              <p className="numeric text-base">{Math.round(week?.volumeKg ?? 0)}</p>
              <p className="text-xs text-text-muted">{t("today.weekVolume")}</p>
            </div>
            <div className="px-1 py-1">
              <p className="numeric text-base">{weekSets}</p>
              <p className="text-xs text-text-muted">{t("today.weekSets")}</p>
            </div>
          </Card>

          {prs.length > 0 ? (
            <Card className="overflow-hidden">
              <p className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                {t("today.recentPrs")}
              </p>
              <ul className="divide-y divide-border pt-1">
                {prs.map((pr) => (
                  <li
                    key={pr.exerciseId}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm">{exerciseName(pr.exerciseId)}</span>
                    <span className="numeric shrink-0 text-sm text-text-muted">
                      {displayWeight(pr.weightKg, settings.data?.weightUnit ?? "kg")} × {pr.reps}
                      {pr.rpe !== null ? ` @ ${pr.rpe} RPE` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {recent.length > 0 ? (
            <>
              <p className="mt-1 px-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                {t("today.recentWorkouts")}
              </p>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {recent.map((workout) => (
                    <li key={workout.id}>
                      <WorkoutRow workout={workout} />
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          ) : null}
        </>
      )}

      {(photos.data ?? []).length > 0 ? (
        <div>
          <p className="mt-1 px-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("photos.title")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(photos.data ?? []).map((p) => (
              <a key={p.id} href="/photos" className="block">
                <img
                  src={`/api/v1/photos/${p.id}/image`}
                  alt=""
                  className="aspect-square w-full rounded object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
