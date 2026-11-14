import type { Workout } from "@reph/contracts";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { usePhotos } from "../../api/hooks";
import { workoutVolumeKg } from "../../lib/stats";

// One history/Today row — date day, title, sets count, volume, duration;
// links to the workout detail. Shared by HistoryScreen and TodayScreen
// (docs/plans/phase-1-mvp.md Task 10/11).

export function WorkoutRow({ workout, showPhotos = true }: { workout: Workout; showPhotos?: boolean }) {
  const { t } = useTranslation();
  const photos = usePhotos(4, 0, workout.id);
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
      search={{ from: "history" }}
      className="flex min-h-14 flex-col gap-1 px-4 py-3 active:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">
          {workout.title === "" ? t("workout.titlePlaceholder") : workout.title}
        </span>
        <span className="numeric shrink-0 text-xs text-text-muted">
          {minutes} {t("common.minutesShort")}
        </span>
      </div>
      <span className="truncate text-xs text-text-muted">
        {format(workout.startTime, "d MMM")} · {t("history.setsCount", { count: sets })} ·{" "}
        {t("history.volumeDisplay", { value: Math.round(workoutVolumeKg(workout)) })}
      </span>
      {workout.notes !== "" ? (
        <span className="truncate text-xs text-text-muted">{workout.notes}</span>
      ) : null}
      {showPhotos && (photos.data ?? []).length > 0 ? (
        <div className="grid grid-cols-4 gap-1">
          {(photos.data ?? []).map((p) => (
            <img
              key={p.id}
              src={`/api/v1/photos/${p.id}/image`}
              alt=""
              className="aspect-square w-full rounded object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
    </Link>
  );
}
