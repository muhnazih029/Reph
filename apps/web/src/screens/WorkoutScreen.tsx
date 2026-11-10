import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearch } from "@tanstack/react-router";
import {
  useActiveWorkout,
  useRoutines,
  useCreateRoutine,
  useStartRoutine,
  useWorkouts,
} from "../api/hooks";
import { useActiveWorkoutStore } from "../stores/activeWorkout";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Skeleton } from "../components/ui/Skeleton";
import { RoutineRow } from "../components/workout/RoutineRow";
import { ExercisesScreen } from "./ExercisesScreen";

// Workout — the tab that carries both sides of the old "Workout" and
// "Exercises" menus (pen.dev design): a segmented control over Routines
// and the exercise library, an inline create field, and one row per
// routine with its last use.

export function WorkoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const search = useSearch({ from: "/workout" });
  const active = useActiveWorkout();
  const routines = useRoutines();
  const createRoutine = useCreateRoutine();
  const startRoutine = useStartRoutine();
  const workouts = useWorkouts(200);
  const [view, setView] = useState<"routines" | "exercises">(search.tab ?? "routines");
  const [name, setName] = useState("");

  // The segment lives in the URL, so a deep link (?tab=exercises) and the
  // browser back button both land on the right side of the tab.
  const selectView = (next: "routines" | "exercises") => {
    setView(next);
    void router.navigate({ to: "/workout", search: { tab: next }, replace: true });
  };

  const lastUse = useMemo(() => {
    const map = new Map<string, number>();
    for (const workout of workouts.data ?? []) {
      if (workout.title === "") continue;
      const current = map.get(workout.title);
      if (current === undefined || workout.startTime > current) {
        map.set(workout.title, workout.startTime);
      }
    }
    return map;
  }, [workouts.data]);

  const createR = async () => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    const r = await createRoutine.mutateAsync({ name: trimmed });
    setName("");
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
    <section aria-labelledby="workout-title" className="flex flex-col gap-4">
      <h2 id="workout-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
        {t("workout.titleTab")}
      </h2>

      <SegmentedControl
        variant="pill"
        label={t("workout.titleTab")}
        value={view}
        onChange={selectView}
        options={[
          { value: "routines", label: t("tabs.routines") },
          { value: "exercises", label: t("tabs.exercises") },
        ]}
      />

      {view === "exercises" ? (
        <ExercisesScreen />
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              aria-label={t("routines.newPlaceholder")}
              type="text"
              placeholder={t("routines.newPlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createR();
              }}
            />
            <Button
              variant="secondary"
              className="shrink-0 px-4 text-[13px] font-semibold"
              onClick={() => void createR()}
              disabled={createRoutine.isPending || name.trim() === ""}
            >
              {t("routines.create")}
            </Button>
          </div>

          {routines.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : (routines.data ?? []).length === 0 ? (
            <EmptyState title={t("routines.empty")} body={t("routines.emptyBody")} />
          ) : (
            <div className="flex flex-col gap-2">
              {(routines.data ?? []).map((routine) => {
                const last = lastUse.get(routine.name);
                const lastWorkout = (workouts.data ?? []).find(
                  (workout) => workout.title === routine.name,
                );
                return (
                  <RoutineRow
                    key={routine.id}
                    routine={routine}
                    lastWorkout={last !== undefined ? lastWorkout : undefined}
                    startLabel={t("routines.start")}
                    onOpen={() =>
                      void router.navigate({ to: "/routines/$id", params: { id: routine.id } })
                    }
                    onStart={() => startR(routine.id)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
