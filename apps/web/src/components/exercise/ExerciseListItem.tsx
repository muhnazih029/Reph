import type { Exercise } from "@reph/contracts";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

// One row of the exercise list — name + muscle group + custom badge.
// Whole row is the 44 px+ navigation target (DESIGN.md §3).

export function ExerciseListItem({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/exercises/$id"
      params={{ id: exercise.id }}
      className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm active:bg-surface-2"
    >
      <span className="truncate">{exercise.name}</span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-text-muted">
        {exercise.isCustom ? (
          <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-text-muted">
            {t("exercises.custom")}
          </span>
        ) : null}
        <span>{t(`muscleGroups.${exercise.muscleGroup}`)}</span>
      </span>
    </Link>
  );
}
