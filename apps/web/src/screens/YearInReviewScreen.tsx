import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useWorkouts, useExercises, useSettings } from "../api/hooks";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { kgToLb } from "../lib/units";
import { volumeByMuscleGroup } from "../lib/stats";
import type { Workout } from "@reph/contracts";

type Stats = {
  workouts: number;
  volumeKg: number;
  sets: number;
  minutes: number;
  favoriteExercise: string | null;
  topMuscleGroup: string | null;
  bestMonth: string | null;
  bestMonthWorkouts: number;
};

function compute(workouts: Workout[], exerciseMuscleGroup: (id: string) => string): Stats {
  const done = workouts.filter((w) => w.status === "completed");
  let sets = 0;
  let minutes = 0;
  const exerciseCount = new Map<string, number>();
  const monthCount = new Map<string, number>();

  for (const workout of done) {
    minutes += (workout.endTime ?? workout.startTime) - workout.startTime;
    const month = new Date(workout.startTime).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    });
    monthCount.set(month, (monthCount.get(month) ?? 0) + 1);
    for (const entry of workout.entries) {
      exerciseCount.set(entry.exerciseId, (exerciseCount.get(entry.exerciseId) ?? 0) + 1);
      for (const set of entry.sets) if (set.done) sets += 1;
    }
  }

  const volumes = volumeByMuscleGroup(done, exerciseMuscleGroup);
  const volumeKg = volumes.reduce((sum, row) => sum + row.volumeKg, 0);
  const topMuscleGroup = volumes[0]?.muscleGroup ?? null;
  const favoriteExercise =
    exerciseCount
      .entries()
      .toArray()
      .toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const bestMonthEntry = monthCount
    .entries()
    .toArray()
    .toSorted((a, b) => b[1] - a[1])[0];

  return {
    workouts: done.length,
    volumeKg,
    sets,
    minutes: Math.round(minutes / 60000),
    favoriteExercise,
    topMuscleGroup,
    bestMonth: bestMonthEntry?.[0] ?? null,
    bestMonthWorkouts: bestMonthEntry?.[1] ?? 0,
  };
}

export function YearInReviewScreen() {
  const { t } = useTranslation();
  const workouts = useWorkouts(500);
  const exercises = useExercises();
  const settings = useSettings();
  const unit = settings.data?.weightUnit ?? "kg";
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const exerciseName = (id: string): string =>
    exercises.data?.find((exercise) => exercise.id === id)?.name ?? t("common.loading");
  const exerciseMuscleGroup = (id: string): string =>
    exercises.data?.find((exercise) => exercise.id === id)?.muscleGroup ?? "other";

  const stats = useMemo(() => {
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year + 1, 0, 1).getTime();
    const filtered = (workouts.data ?? []).filter(
      (workout) => workout.startTime >= yearStart && workout.startTime < yearEnd,
    );
    return compute(filtered, exerciseMuscleGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts.data, exercises.data, year]);

  const favoriteName = stats.favoriteExercise ? exerciseName(stats.favoriteExercise) : null;

  return (
    <section aria-labelledby="yir-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link
          to="/history"
          search={{ view: "insight" }}
          aria-label={t("weight.back")}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          ←
        </Link>
        <h2 id="yir-title" className="text-xl font-medium">
          {t("yearInReview.title")}
        </h2>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setYear(year - 1)} className="min-h-9 min-w-9">
          ‹
        </button>
        <span className="text-lg font-semibold">{year}</span>
        <button
          type="button"
          onClick={() => setYear(Math.min(thisYear, year + 1))}
          className="min-h-9 min-w-9 disabled:opacity-30"
          disabled={year >= thisYear}
        >
          ›
        </button>
      </div>

      {workouts.isPending ? (
        <>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </>
      ) : stats.workouts === 0 ? (
        <Card className="p-4 text-sm text-text-muted">{t("yearInReview.empty")}</Card>
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-3 p-4 text-center">
            <div>
              <p className="numeric text-2xl font-semibold">{stats.workouts}</p>
              <p className="text-xs text-text-muted">{t("yearInReview.workouts")}</p>
            </div>
            <div>
              <p className="numeric text-2xl font-semibold">{stats.sets}</p>
              <p className="text-xs text-text-muted">{t("yearInReview.sets")}</p>
            </div>
            <div>
              <p className="numeric text-2xl font-semibold">
                {Math.round(unit === "kg" ? stats.volumeKg : kgToLb(stats.volumeKg))}
                <span className="text-sm"> {unit === "kg" ? "kg" : "lb"}</span>
              </p>
              <p className="text-xs text-text-muted">{t("yearInReview.volume")}</p>
            </div>
            <div>
              <p className="numeric text-2xl font-semibold">{stats.minutes}</p>
              <p className="text-xs text-text-muted">{t("yearInReview.minutes")}</p>
            </div>
          </Card>

          <Card className="flex flex-col gap-2 p-4 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text-muted">{t("yearInReview.favorite")}</span>
              <span className="min-w-0 truncate font-medium">
                {favoriteName ?? t("common.loading")}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text-muted">{t("yearInReview.topMuscleGroup")}</span>
              <span className="font-medium">
                {stats.topMuscleGroup ? t(`muscleGroups.${stats.topMuscleGroup}`) : "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text-muted">{t("yearInReview.bestMonth")}</span>
              <span className="font-medium">
                {stats.bestMonth ? `${stats.bestMonth} · ${stats.bestMonthWorkouts}` : "—"}
              </span>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}
