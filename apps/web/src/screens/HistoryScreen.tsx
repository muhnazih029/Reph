import type { Workout } from "@reph/contracts";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouter } from "@tanstack/react-router";
import { useWorkouts, useRoutines, useCreateRoutine, useDeleteRoutine, useStartRoutine, useActiveWorkout } from "../api/hooks";
import { useActiveWorkoutStore } from "../stores/activeWorkout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { WorkoutRow } from "../components/history/WorkoutRow";
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

export function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const workouts = useWorkouts(200);
  const routines = useRoutines();
  const createRoutine = useCreateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const startRoutine = useStartRoutine();
  const active = useActiveWorkout();
  const [routineName, setRoutineName] = useState("");

  const completed = useMemo(
    () => (workouts.data ?? []).filter((workout) => workout.status === "completed"),
    [workouts.data],
  );
  const groups = useMemo(() => groupByMonth(completed), [completed]);

  const createR = async () => {
    const trimmed = routineName.trim();
    if (!trimmed) return;
    const r = await createRoutine.mutateAsync({ name: trimmed });
    setRoutineName("");
    void router.navigate({ to: "/routines/$id", params: { id: r.id } });
  };

  const startR = (rid: string) => {
    if (active.data) {
      const ok = window.confirm(t("routines.activeExists"));
      if (!ok) return;
      void useActiveWorkoutStore.getState().discardWorkout().then(() =>
        startRoutine.mutateAsync(rid).then(() => router.navigate({ to: "/workout/active" })),
      );
      return;
    }
    void startRoutine.mutateAsync(rid).then(() => router.navigate({ to: "/workout/active" }));
  };

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h2 id="history-title" className="text-xl font-medium">
        {t("history.title")}
      </h2>

      <div className="flex gap-2">
        <Link
          to="/calendar"
          className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-center text-sm"
        >
          {t("calendar.title")}
        </Link>
        <Link
          to="/photos"
          className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-center text-sm"
        >
          {t("photos.title")}
        </Link>
      </div>

      {/* Routines section */}
      <div className="flex flex-col gap-2">
        <h3 className="px-1 text-sm font-medium uppercase tracking-wide text-text-muted">
          {t("routines.title")}
        </h3>
        <div className="flex gap-2">
          <input
            aria-label={t("routines.name")}
            placeholder={t("routines.namePlaceholder")}
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createR();
            }}
            className="min-h-11 flex-1 rounded-sm border border-border bg-surface px-3 text-sm"
          />
          <Button onClick={() => void createR()} disabled={!routineName.trim() || createRoutine.isPending}>
            {t("routines.create")}
          </Button>
        </div>
        {(routines.data ?? []).length > 0 ? (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {(routines.data ?? []).map((routine) => (
                <li key={routine.id} className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void router.navigate({ to: "/routines/$id", params: { id: routine.id } })}
                  >
                    <p className="truncate text-sm font-medium">{routine.name}</p>
                    <p className="text-xs text-text-muted">
                      {routine.entries.length} {t("routines.exercises")}
                    </p>
                  </button>
                  <Button variant="secondary" onClick={() => startR(routine.id)} disabled={startRoutine.isPending}>
                    {t("routines.start")}
                  </Button>
                  <button
                    type="button"
                    aria-label={t("routines.delete")}
                    className="min-h-9 min-w-9 text-danger"
                    onClick={() => void deleteRoutine.mutateAsync(routine.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

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
                    <WorkoutRow workout={workout} />
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
