import type { Workout } from "@reph/contracts";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { workoutVolumeKg } from "../../lib/stats";

// One history/Today row — date day, title, sets count, volume, duration;
// links to the workout detail. Shared by HistoryScreen and TodayScreen
// (docs/plans/phase-1-mvp.md Task 10/11).

export function WorkoutRow({ workout }: { workout: Workout }) {
  const { t } = useTranslation();
  const sets = workout.entries.reduce(
    (count, entry) => count + entry.sets.filter((set) => set.done).length,
    0,
  );
  const minutes =
    workout.endTime === null
      ? "–"
      : String(Math.max(1, Math.round((workout.endTime - workout.startTime) / 60_000)));

  return (
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
          {format(workout.startTime, "d MMM")} · {t("history.setsCount", { count: sets })} ·{" "}
          {t("history.volumeDisplay", { value: Math.round(workoutVolumeKg(workout)) })}
        </span>
        {workout.notes !== "" ? (
          <span className="truncate text-xs text-text-muted">{workout.notes}</span>
        ) : null}
      </span>
      <span className="numeric shrink-0 text-sm text-text-muted">
        {minutes} {t("common.minutesShort")}
      </span>
    </Link>
  );
}
