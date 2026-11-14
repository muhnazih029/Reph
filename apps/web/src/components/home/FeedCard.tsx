import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { Workout } from "@reph/contracts";
import { usePhotos, useSettings } from "../../api/hooks";
import { workoutVolumeKg } from "../../lib/stats";
import { displayWeight } from "../../lib/units";
import { Card } from "../ui/Card";

// Feed card — the home feed reads like a small Instagram: the progress
// photo leads (1:1, cover), the workout title and numbers read as the
// caption. "grid" is the tile (photo only), "list" is the compact row.

export const DEFAULT_WORKOUT_IMAGE = "/default-workout.svg";

export function FeedCard({
  workout,
  variant = "grid",
}: {
  workout: Workout;
  variant?: "grid" | "list";
}) {
  const { t } = useTranslation();
  const photos = usePhotos(1, 0, workout.id);
  const settings = useSettings();
  const photo = (photos.data ?? [])[0];

  const sets = workout.entries.reduce(
    (count, entry) => count + entry.sets.filter((set) => set.done).length,
    0,
  );
  const minutes =
    workout.endTime === null
      ? null
      : Math.max(1, Math.round((workout.endTime - workout.startTime) / 60_000));
  const volume = Math.round(workoutVolumeKg(workout));
  const unit = settings.data?.weightUnit ?? "kg";

  const image = (
    <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
      <img
        src={photo ? `/api/v1/photos/${photo.id}/image` : DEFAULT_WORKOUT_IMAGE}
        alt={photo?.notes === "" || !photo ? t("today.recentWorkouts") : photo.notes}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );

  const caption = (
    <>
      <p className="truncate text-[15px] font-semibold">
        {workout.title === "" ? t("workout.titlePlaceholder") : workout.title}
      </p>
      <p className="truncate text-xs text-text-muted">
        {format(workout.startTime, "d MMM")} · {t("history.setsCount", { count: sets })} ·{" "}
        {displayWeight(volume, unit)}
        {minutes !== null ? ` · ${minutes} min` : ""}
      </p>
      {workout.notes !== "" ? (
        <p className="line-clamp-2 text-xs text-text-muted/80">{workout.notes}</p>
      ) : null}
    </>
  );

  if (variant === "grid") {
    return (
      <Link
        to="/workouts/$id"
        params={{ id: workout.id }}
        search={{ from: "home" }}
        className="flex flex-col overflow-hidden rounded-radius border border-border transition-colors hover:border-accent/50"
      >
        {image}
        <div className="flex flex-col gap-0.5 p-2.5">{caption}</div>
      </Link>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Link
        to="/workouts/$id"
        params={{ id: workout.id }}
        search={{ from: "home" }}
        className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2/40"
      >
        <div className="min-w-0 flex-1">{caption}</div>
      </Link>
    </Card>
  );
}
