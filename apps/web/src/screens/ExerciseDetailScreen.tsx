import type { Workout } from "@reph/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useExercise, useSettings, useWorkouts } from "../api/hooks";
import { useRouter } from "@tanstack/react-router";
import { bestSetByEpley, previousPerformance } from "../lib/stats";
import { displayWeight } from "../lib/units";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";

// Exercise detail — badges, PR card (best Epley across all sessions),
// "last performed" line via previousPerformance, and the per-session
// history with each session's best set highlighted (Task 7).

type PrRecord = { weightKg: number; reps: number; oneRM: number; date: number };

function computePersonalRecord(workouts: Workout[], exerciseId: string): PrRecord | null {
  let best: PrRecord | null = null;
  for (const workout of workouts) {
    for (const entry of workout.entries) {
      if (entry.exerciseId !== exerciseId) continue;
      const sessionBest = bestSetByEpley(entry.sets);
      if (sessionBest && (!best || sessionBest.oneRM > best.oneRM)) {
        best = { ...sessionBest, date: workout.startTime };
      }
    }
  }
  return best;
}

export function ExerciseDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const exercise = useExercise(id);
  const workouts = useWorkouts(200);
  const router = useRouter();
  const settings = useSettings();
  const unit = settings.data?.weightUnit ?? "kg";

  const personalRecord = useMemo(
    () => computePersonalRecord(workouts.data ?? [], id),
    [workouts.data, id],
  );

  const lastPerformed = useMemo(
    () => previousPerformance(workouts.data ?? [], id),
    [workouts.data, id],
  );

  const sessions = useMemo(
    () =>
      (workouts.data ?? [])
        .map((workout) => ({ workout, entry: workout.entries.find((e) => e.exerciseId === id) }))
        .filter((row): row is { workout: Workout; entry: NonNullable<(typeof row)["entry"]> } =>
          Boolean(row.entry),
        ),
    [workouts.data, id],
  );

  if (exercise.isPending || (workouts.isPending && !lastPerformed && !personalRecord)) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (exercise.error) {
    return (
      <ErrorState
        message={exercise.error instanceof Error ? exercise.error.message : undefined}
        onRetry={() => void exercise.refetch()}
      />
    );
  }

  const data = exercise.data;
  if (!data) {
    return <EmptyState title={t("exercises.empty")} />;
  }

  return (
    <section aria-labelledby="exercise-detail-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("exercises.title")}
          onClick={() => void router.navigate({ to: "/exercises" })}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          ←
        </button>
        <h2 id="exercise-detail-title" className="text-xl font-medium">
          {data.name}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-sm bg-surface-2 px-2 py-1 text-text-muted">
          {t(`muscleGroups.${data.muscleGroup}`)}
        </span>
        <span className="rounded-sm bg-surface-2 px-2 py-1 text-text-muted">
          {t(`equipment.${data.equipment}`)}
        </span>
        <span className="rounded-sm bg-surface-2 px-2 py-1 text-text-muted">
          {t(`exerciseType.${data.type}`)}
        </span>
        {data.isCustom ? (
          <span className="rounded-sm bg-surface-2 px-2 py-1 text-text-muted">
            {t("exercises.custom")}
          </span>
        ) : null}
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <h3 className="text-sm font-medium text-text">{t("exercises.prTitle")}</h3>
        {personalRecord ? (
          <>
            <p className="numeric text-2xl">
              {displayWeight(personalRecord.weightKg, unit)} × {personalRecord.reps}
              <span className="ml-2 text-sm text-text-muted">
                e1RM {displayWeight(Math.round(personalRecord.oneRM * 10) / 10, unit)}
              </span>
            </p>
            <p className="text-xs text-text-muted">
              {new Date(personalRecord.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">{t("exercises.noPr")}</p>
        )}
        {lastPerformed ? (
          <p className="text-sm text-text-muted">
            {t("exercises.last")}: {displayWeight(lastPerformed.weightKg, unit)} ×{" "}
            {lastPerformed.reps}
            {lastPerformed.rpe !== null ? ` @ ${lastPerformed.rpe} RPE` : ""}
          </p>
        ) : null}
      </Card>

      <h3 className="text-sm font-medium text-text">{t("exercises.sessions")}</h3>
      {sessions.length === 0 ? (
        <EmptyState title={t("exercises.noSessions")} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {sessions.map(({ workout, entry }) => {
              const sessionBest = bestSetByEpley(entry.sets);
              return (
                <li key={workout.id} className="px-4 py-3">
                  <p className="text-sm">
                    {new Date(workout.startTime).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {entry.sets
                      .filter((set) => set.done)
                      .map((set) =>
                        set.weightKg !== null && set.reps !== null
                          ? `${displayWeight(set.weightKg, unit)} × ${set.reps}`
                          : set.durationSeconds !== null
                            ? `${Math.round(set.durationSeconds / 60)} ${t("common.minutesShort")}`
                            : t("common.set"),
                      )
                      .join(" · ")}
                  </p>
                  {sessionBest ? (
                    <p className="numeric mt-1 text-xs font-medium text-accent">
                      {t("exercises.best")}: {displayWeight(sessionBest.weightKg, unit)} ×{" "}
                      {sessionBest.reps}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
