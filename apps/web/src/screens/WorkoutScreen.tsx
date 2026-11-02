import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import {
  useActiveWorkout,
  useCreateWorkout,
  useRoutines,
  useCreateRoutine,
  useDeleteRoutine,
  useStartRoutine,
} from "../api/hooks";
import { useActiveWorkoutStore } from "../stores/activeWorkout";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

export function WorkoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const active = useActiveWorkout();
  const createWorkout = useCreateWorkout();
  const routines = useRoutines();
  const createRoutine = useCreateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const startRoutine = useStartRoutine();
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      if (!active.data) await createWorkout.mutateAsync({});
      await router.navigate({ to: "/workout/active" });
    } finally {
      setStarting(false);
    }
  };

  const createR = async () => {
    const r = await createRoutine.mutateAsync({ name: t("routines.newDefault") });
    void router.navigate({ to: "/routines/$id", params: { id: r.id } });
  };

  const startR = (rid: string) => {
    if (active.data) {
      const ok = window.confirm(t("routines.activeExists"));
      if (!ok) return;
      void useActiveWorkoutStore
        .getState()
        .discardWorkout()
        .then(() =>
          startRoutine.mutateAsync(rid).then(() => router.navigate({ to: "/workout/active" })),
        );
      return;
    }
    void startRoutine.mutateAsync(rid).then(() => router.navigate({ to: "/workout/active" }));
  };

  return (
    <section aria-labelledby="workout-title" className="flex flex-col gap-3">
      <h2 id="workout-title" className="text-xl font-medium">
        {t("workout.titleTab")}
      </h2>

      <Button
        className="min-h-12 w-full text-base"
        disabled={starting || active.isPending}
        onClick={() => void start()}
      >
        {active.data ? t("today.resume") : t("today.startWorkout")}
      </Button>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          {t("routines.title")}
        </h3>
        <Button
          variant="secondary"
          className="min-h-8 px-3 py-1 text-xs"
          onClick={() => void createR()}
          disabled={createRoutine.isPending}
        >
          {t("routines.create")}
        </Button>
      </div>

      {routines.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : (routines.data ?? []).length === 0 ? (
        <EmptyState title={t("routines.empty")} body={t("routines.emptyBody")} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {(routines.data ?? []).map((routine) => (
              <li key={routine.id} className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    void router.navigate({ to: "/routines/$id", params: { id: routine.id } })
                  }
                >
                  <p className="truncate text-sm font-medium">{routine.name}</p>
                  <p className="text-xs text-text-muted">
                    {routine.entries.length} {t("routines.exercises")}
                  </p>
                </button>
                <Button
                  variant="secondary"
                  onClick={() => startR(routine.id)}
                  disabled={startRoutine.isPending}
                >
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
      )}

      <Button
        variant="secondary"
        onClick={() => void router.navigate({ to: "/body-metrics" })}
      >
        {t("bodyMetrics.title")}
      </Button>
    </section>
  );
}
