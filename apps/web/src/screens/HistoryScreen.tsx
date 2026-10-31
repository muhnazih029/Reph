import type { Workout } from "@reph/contracts";
import { format } from "date-fns";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useWorkouts } from "../api/hooks";
import { workoutVolumeKg } from "../lib/stats";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";

// History — workouts grouped by month (date-fns 'LLLL yyyy', ascending
// headers), rows link to detail; skeleton/empty/error states (Task 10).

type MonthGroup = { label: string; workouts: Workout[] };

function groupByMonth(workouts: Workout[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const workout of workouts) {
    const label = format(workout.startTime, "LLLL yyyy");
    const group = groups.get(label) ?? { label, workouts: [] };
    group.workouts.push(workout);
    groups.set(label, group);
  }
  return Array.from(groups.values());
}

function durationLabel(workout: Workout): string {
  if (workout.endTime === null) return "–";
  return `${Math.max(1, Math.round((workout.endTime - workout.startTime) / 60_000))}`;
}

export function HistoryScreen() {
  const { t } = useTranslation();
  const workouts = useWorkouts(200);

  const completed = useMemo(
    () => (workouts.data ?? []).filter((workout) => workout.status === "completed"),
    [workouts.data],
  );
  const groups = useMemo(() => groupByMonth(completed), [completed]);

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h2 id="history-title" className="text-xl font-medium">
        {t("history.title")}
      </h2>

      {workouts.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-16 w-full" />
          ))}
        </div>
      ) : workouts.error ? (
        <ErrorState
          message={workouts.error instanceof Error ? workouts.error.message : undefined}
          onRetry={() => void workouts.refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title={t("history.empty")}
          action={
            <Link
              to="/"
              className="inline-flex min-h-11 items-center justify-center rounded-radius border border-border bg-surface-2 px-4 text-sm"
            >
              {t("today.startWorkout")}
            </Link>
          }
        />
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <h3 className="mt-2 px-1 text-sm font-medium uppercase tracking-wide text-text-muted">
              {group.label}
            </h3>
            <Card className="mt-1 overflow-hidden">
              <ul className="divide-y divide-border">
                {group.workouts.map((workout) => (
                  <li key={workout.id}>
                    <Link
                      to="/workouts/$id"
                      params={{ id: workout.id }}
                      className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 active:bg-surface-2"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">
                          {workout.title === "" ? t("workout.titlePlaceholder") : workout.title}
                        </span>
                        <span className="text-xs text-text-muted">
                          {format(workout.startTime, "d MMM")} ·{" "}
                          {t("history.setsCount", { count: doneSets(workout) })} ·{" "}
                          {t("history.volumeDisplay", {
                            value: Math.round(workoutVolumeKg(workout)),
                          })}
                        </span>
                      </span>
                      <span className="numeric shrink-0 text-sm text-text-muted">
                        {durationLabel(workout)} {t("common.minutesShort")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))
      )}
    </section>
  );
}

function doneSets(workout: Workout): number {
  return workout.entries.reduce(
    (count, entry) => count + entry.sets.filter((set) => set.done).length,
    0,
  );
}
