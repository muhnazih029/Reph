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
} from "../api/hooks";
import { bestSetByEpley, estimate1RM, weeklyVolumeSeries } from "../lib/stats";
import { displayWeight } from "../lib/units";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { Skeleton } from "../components/ui/Skeleton";
import { AccountMenu } from "../components/account/AccountMenu";
import { WorkoutFeed } from "../components/home/WorkoutFeed";

// Today home — greeting + date and the account avatar, the primary
// Start/Resume CTA, a this-week summary (completed workouts, volume,
// sets) with the weekly-goal bar, up to three recent personal records
// across the last 20 completed workouts (Epley 1RM per exercise), and
// the five most recent workouts. Mobile stacks; from md up the records
// and the workout list sit side by side (pen.dev design).

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

  const goal = settings.data?.weeklyWorkoutGoal ?? 0;
  const goalDone = Math.min(thisWeek.length, goal);
  const goalPercent = goal > 0 ? Math.min(100, (goalDone / goal) * 100) : 0;
  const unit = settings.data?.weightUnit ?? "kg";

  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-5 md:gap-7">
      <header className="flex flex-wrap items-center gap-3 md:gap-6">
        <div className="min-w-0 flex-1">
          <h2 id="today-title" className="text-xl font-semibold">
            {t("today.greeting")}
          </h2>
          <p className="text-sm text-text-muted">{format(Date.now(), "EEEE, d MMMM")}</p>
        </div>

        <AccountMenu variant="avatar" />

        <Button
          className="order-last min-h-11 w-full rounded-full px-5 text-base md:order-none md:w-auto"
          disabled={starting || workouts.isPending || active.isPending}
          onClick={() => void start()}
        >
          {active.data ? t("today.resume") : t("today.startWorkout")}
        </Button>
      </header>

      {workouts.isPending || active.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : completed.length === 0 && !active.data ? (
        <EmptyState title={t("history.empty")} body={t("today.firstRunBody")} />
      ) : (
        <div className="flex flex-col gap-5 md:gap-6">
          <Card className="flex flex-col gap-4 rounded-[16px] px-6 py-5 md:flex-row md:items-center md:gap-10">
            <div className="grid grid-cols-3 items-center gap-4 md:shrink-0 md:gap-12">
              <div className="flex flex-col items-center gap-1">
                <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted">
                  {t("today.weekWorkouts")}
                </p>
                <p className="numeric whitespace-nowrap text-2xl font-semibold">
                  {thisWeek.length}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted">
                  {t("today.weekVolumeUnit", { unit: unit === "lbs" ? "lb" : "kg" })}
                </p>
                <p className="numeric whitespace-nowrap text-2xl font-semibold">
                  {displayWeight(Math.round(week?.volumeKg ?? 0), unit)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted">
                  {t("today.weekSets")}
                </p>
                <p className="numeric whitespace-nowrap text-2xl font-semibold">{weekSets}</p>
              </div>
            </div>

            <div aria-hidden="true" className="hidden h-14 w-px bg-border md:block" />

            <div className="flex flex-col gap-2 md:min-w-0 md:flex-1">
              <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                <span>{t("today.weeklyGoal")}</span>
                <span className="numeric whitespace-nowrap">
                  {t("today.weekGoalProgress", { done: goalDone, goal })}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-accent" style={{ width: `${goalPercent}%` }} />
              </div>
            </div>
          </Card>

          {prs.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-[15px] font-semibold">{t("today.recentPrs")}</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {prs.map((pr) => (
                  <Card key={pr.exerciseId} className="flex items-center gap-2.5 px-3.5 py-[10px]">
                    <Icon name="award" size={18} className="shrink-0 text-accent" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {exerciseName(pr.exerciseId)}
                    </span>
                    <span className="numeric shrink-0 text-[13px] font-semibold">
                      {displayWeight(pr.weightKg, unit)} × {pr.reps}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          <WorkoutFeed />
        </div>
      )}
    </section>
  );
}
