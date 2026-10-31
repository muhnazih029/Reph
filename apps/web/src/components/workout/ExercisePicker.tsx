import type { Exercise, MuscleGroup } from "@reph/contracts";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useExercises, useWorkouts } from "../../api/hooks";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Sheet } from "../ui/Sheet";
import { Skeleton } from "../ui/Skeleton";

// Bottom-sheet exercise picker — search (debounced 200 ms), five most
// recently used exercises, then the full grouped library (Task 9).
// Reused by Phase 2 templates via { open, onOpenChange, onSelect(exerciseId) }.

const MUSCLE_GROUP_ORDER = [
  "cardio",
  "chest",
  "back",
  "shoulders",
  "upper_arms",
  "forearms",
  "hips",
  "thighs",
  "calves",
  "waist",
] as const;

export function ExercisePicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exerciseId: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
      setQuery("");
      return;
    }
    const timer = setTimeout(() => setQuery(search.trim()), 200);
    return () => clearTimeout(timer);
  }, [search, open]);

  const exercises = useExercises(query ? { q: query } : undefined);
  const workouts = useWorkouts(10);

  const recent: Exercise[] = useMemo(() => {
    const byId = new Map((exercises.data ?? []).map((exercise) => [exercise.id, exercise]));
    const seen = new Set<string>();
    const result: Exercise[] = [];
    for (const workout of workouts.data ?? []) {
      for (const entry of workout.entries) {
        const exercise = byId.get(entry.exerciseId);
        if (exercise && !seen.has(entry.exerciseId)) {
          seen.add(entry.exerciseId);
          result.push(exercise);
          if (result.length >= 5) return result;
        }
      }
    }
    return result;
  }, [exercises.data, workouts.data]);

  const grouped = useMemo(() => {
    const byGroup = new Map<MuscleGroup, Exercise[]>();
    for (const group of MUSCLE_GROUP_ORDER) byGroup.set(group, []);
    for (const exercise of exercises.data ?? []) {
      const list = byGroup.get(exercise.muscleGroup);
      list?.push(exercise);
    }
    return Array.from(byGroup.entries()).filter(([, list]) => list.length > 0);
  }, [exercises.data]);

  const searching = query !== "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("workout.addExercise")}>
      <Input
        aria-label={t("exercises.search")}
        type="search"
        placeholder={t("exercises.search")}
        className="mb-3"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {exercises.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : !searching && recent.length > 0 ? (
        <div className="mb-3">
          <h4 className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("workout.recent")}
          </h4>
          <ul className="grid grid-cols-2 gap-1">
            {recent.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(exercise.id);
                    onOpenChange(false);
                  }}
                  className="min-h-11 w-full truncate rounded-sm bg-surface-2 px-3 py-2 text-left text-sm"
                >
                  {exercise.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (exercises.data ?? []).length === 0 ? (
        <EmptyState title={t("exercises.empty")} />
      ) : null}

      {!exercises.isPending ? (
        searching ? (
          <ul className="divide-y divide-border">
            {(exercises.data ?? []).map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(exercise.id);
                    onOpenChange(false);
                  }}
                  className="flex min-h-11 w-full items-center px-2 py-3 text-sm"
                >
                  {exercise.name}
                  <span className="ml-auto text-xs text-text-muted">
                    {t(`muscleGroups.${exercise.muscleGroup}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-y-auto">
            {grouped.map(([group, list]) => (
              <div key={group}>
                <h4 className="px-2 pt-3 text-xs font-medium uppercase tracking-wide text-text-muted">
                  {t(`muscleGroups.${group}`)}
                </h4>
                <ul className="divide-y divide-border">
                  {list.map((exercise) => (
                    <li key={exercise.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(exercise.id);
                          onOpenChange(false);
                        }}
                        className="flex min-h-11 w-full items-center px-2 py-3 text-left text-sm"
                      >
                        {exercise.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : null}
    </Sheet>
  );
}
