import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useWorkouts, useExercises, useSettings } from "../api/hooks";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
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
    <section aria-labelledby="yir-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Link
          to="/history"
          search={{ view: "insight" }}
          aria-label={t("weight.back")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Icon name="arrow-left" size={16} />
        </Link>
        <h2 id="yir-title" className="text-2xl font-semibold">
          {t("yearInReview.title")}
        </h2>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label={t("common.previous")}
          onClick={() => setYear(year - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-muted hover:text-text"
        >
          <Icon name="chevron-right" size={16} className="rotate-180" />
        </button>
        <span className="numeric min-w-[58px] text-center text-2xl font-semibold">{year}</span>
        <button
          type="button"
          aria-label={t("common.next")}
          onClick={() => setYear(Math.min(thisYear, year + 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-muted hover:text-text disabled:opacity-30"
          disabled={year >= thisYear}
        >
          <Icon name="chevron-right" size={16} />
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <YearTile value={stats.workouts} label={t("yearInReview.workouts")} />
            <YearTile value={stats.sets} label={t("yearInReview.sets")} />
            <YearTile
              value={`${Math.round(unit === "kg" ? stats.volumeKg : kgToLb(stats.volumeKg)).toLocaleString()} ${unit === "kg" ? "kg" : "lb"}`}
              label={t("yearInReview.volume")}
            />
            <YearTile value={stats.minutes.toLocaleString()} label={t("yearInReview.minutes")} />
          </div>

          <Card className="divide-y divide-border">
            <HighlightRow
              label={t("yearInReview.favorite")}
              value={favoriteName ?? t("common.loading")}
            />
            <HighlightRow
              label={t("yearInReview.topMuscleGroup")}
              value={stats.topMuscleGroup ? t(`muscleGroups.${stats.topMuscleGroup}`) : "—"}
            />
            <HighlightRow
              label={t("yearInReview.bestMonth")}
              value={stats.bestMonth ? `${stats.bestMonth} · ${stats.bestMonthWorkouts}` : "—"}
            />
          </Card>
        </>
      )}
    </section>
  );
}

function YearTile({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="flex flex-col gap-0.5 p-4">
      <span className="numeric text-2xl font-semibold">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-[0.5px] text-text-muted">
        {label}
      </span>
    </Card>
  );
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="min-w-0 truncate text-[13px] font-medium">{value}</span>
    </div>
  );
}
