import type { Workout } from "@reph/contracts";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { useBodyMetrics, useExercises, useSettings, useWorkouts } from "../api/hooks";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { WorkoutRow } from "../components/history/WorkoutRow";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { displayWeight, kgToLb } from "../lib/units";
import { bestSetByEpley, completedSince, volumeByMuscleGroup, workoutVolumeKg } from "../lib/stats";

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

const DAY = 86_400_000;

// Twelve weight bars (140×56) — matches the "Rich Weight" card in the
// pen.dev design. Heights are normalised across the visible window.
function WeightBars({ points }: { points: number[] }) {
  if (points.length === 0) return <div className="h-14 w-[140px]" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  return (
    <div className="flex h-14 w-[140px] items-end gap-1" aria-hidden="true">
      {points.map((point, index) => (
        <span
          key={index}
          className="w-2 rounded-[3px] bg-accent/70"
          style={{ height: `${26 + ((point - min) / span) * 29}px` }}
        />
      ))}
    </div>
  );
}

function MiniMetric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <span className="numeric text-lg font-semibold">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-[0.5px] text-text-muted">
        {label}
      </span>
    </div>
  );
}

function CardHead({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted">
        {label}
      </span>
      <Icon name="chevron-right" size={15} className="text-text-muted" />
    </div>
  );
}

function InsightCards() {
  const { t } = useTranslation();
  const workouts = useWorkouts(500);
  const metrics = useBodyMetrics();
  const exercises = useExercises();
  const settings = useSettings();
  const unit = settings.data?.weightUnit ?? "kg";
  const unitLabel = unit === "kg" ? "kg" : "lb";
  const weightValue = (kg: number) => {
    const value = unit === "kg" ? kg : kgToLb(kg);
    return String(Math.round(value * 10) / 10);
  };

  const completed = useMemo(
    () => (workouts.data ?? []).filter((workout) => workout.status === "completed"),
    [workouts.data],
  );
  const cutoff = Date.now() - 30 * DAY;
  const recent = useMemo(() => completedSince(completed, cutoff), [completed, cutoff]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();

  const exerciseMuscleGroup = (id: string): string =>
    exercises.data?.find((exercise) => exercise.id === id)?.muscleGroup ?? "other";
  const muscleSplit = useMemo(
    () => volumeByMuscleGroup(recent, exerciseMuscleGroup).slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recent, exercises.data],
  );
  const maxMuscle = muscleSplit[0]?.volumeKg ?? 0;

  const volume30 = useMemo(
    () => recent.reduce((sum, workout) => sum + workoutVolumeKg(workout), 0),
    [recent],
  );
  const volume30Display = Math.round(unit === "kg" ? volume30 : kgToLb(volume30));

  const sets30 = useMemo(
    () =>
      recent.reduce(
        (count, workout) =>
          count +
          workout.entries.reduce(
            (inner, entry) => inner + entry.sets.filter((set) => set.done).length,
            0,
          ),
        0,
      ),
    [recent],
  );
  const reps30 = useMemo(
    () =>
      recent.reduce(
        (count, workout) =>
          count +
          workout.entries.reduce(
            (inner, entry) =>
              inner +
              entry.sets.filter((set) => set.done).reduce((sum, set) => sum + (set.reps ?? 0), 0),
            0,
          ),
        0,
      ),
    [recent],
  );

  const thisYear = useMemo(
    () => completed.filter((workout) => workout.startTime >= yearStart),
    [completed, yearStart],
  );
  const yearSets = thisYear.reduce(
    (count, workout) =>
      count +
      workout.entries.reduce((sum, entry) => sum + entry.sets.filter((set) => set.done).length, 0),
    0,
  );
  const yearMinutes = Math.round(
    thisYear.reduce(
      (sum, workout) => sum + (workout.endTime ?? workout.startTime) - workout.startTime,
      0,
    ) / 60000,
  );
  const yearVolume = useMemo(
    () => thisYear.reduce((sum, workout) => sum + workoutVolumeKg(workout), 0),
    [thisYear],
  );
  const yearVolumeDisplay = Math.round(unit === "kg" ? yearVolume : kgToLb(yearVolume));

  const pr = useMemo(() => {
    let best: { name: string; weightKg: number; reps: number; oneRM: number } | null = null;
    for (const workout of completed) {
      if (workout.startTime < monthStart) continue;
      for (const entry of workout.entries) {
        const set = bestSetByEpley(entry.sets);
        if (!set || (best !== null && set.oneRM <= best.oneRM)) continue;
        best = {
          name:
            exercises.data?.find((exercise) => exercise.id === entry.exerciseId)?.name ??
            entry.exerciseId,
          ...set,
        };
      }
    }
    return best;
  }, [completed, monthStart, exercises.data]);

  const weights = useMemo(
    () =>
      (metrics.data ?? [])
        .filter((row) => row.weightKg !== null)
        .toSorted((a, b) => a.recordedAt - b.recordedAt),
    [metrics.data],
  );
  const latest = weights.at(-1) ?? null;
  const weight30 = weights.filter((row) => row.recordedAt >= cutoff);
  const metaRows = weight30.length > 0 ? weight30 : weights.slice(-12);
  const metaValues = metaRows.map((row) => row.weightKg!);
  const minWeight = metaValues.length > 0 ? Math.min(...metaValues) : null;
  const maxWeight = metaValues.length > 0 ? Math.max(...metaValues) : null;
  const baseline =
    weights.filter((row) => row.recordedAt < monthStart).at(-1) ?? weight30.at(0) ?? null;
  const delta = latest && baseline ? latest.weightKg! - baseline.weightKg! : null;
  const deltaPrefix = delta !== null && delta >= 0 ? "+" : "−";
  const baselineMonth = baseline ? format(new Date(baseline.recordedAt), "MMM") : null;
  const bars = weights.slice(-12).map((row) => row.weightKg!);

  const cardClass =
    "flex flex-col gap-3 rounded-radius border border-border bg-surface p-[18px] text-left hover:bg-surface-2";

  if (workouts.isPending || metrics.isPending) {
    return (
      <>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/weight" className={cardClass}>
        <CardHead label={t("history.insightWeightTitle")} />
        <div className="flex items-center gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex items-baseline gap-1.5">
              <span className="numeric text-xl font-semibold">
                {latest ? weightValue(latest.weightKg!) : "—"}
              </span>
              <span className="text-sm text-text-muted">{unitLabel}</span>
            </span>
            {latest === null ? (
              <span className="text-[13px] text-text-muted">{t("history.insightWeightEmpty")}</span>
            ) : (
              <>
                <span className="text-[13px] text-text-muted">
                  {delta !== null && baselineMonth
                    ? t("history.insightWeightDelta", {
                        delta: `${deltaPrefix}${displayWeight(Math.abs(delta), unit)}`,
                        month: baselineMonth,
                      })
                    : t("history.insightLast30")}
                </span>
                {minWeight !== null && maxWeight !== null ? (
                  <span className="text-[11px] text-text-muted">
                    {t("history.insightWeightMeta", {
                      count: weight30.length > 0 ? weight30.length : metaRows.length,
                      min: weightValue(minWeight),
                      max: weightValue(maxWeight),
                    })}
                  </span>
                ) : null}
              </>
            )}
          </div>
          <WeightBars points={bars} />
        </div>
      </Link>

      <Link to="/stats" className={cardClass}>
        <CardHead label={t("history.insightStatsLast30")} />
        <div className="grid grid-cols-3 divide-x divide-border">
          <MiniMetric
            value={volume30Display}
            label={t("history.metricVolume", { unit: unitLabel })}
          />
          <MiniMetric value={sets30} label={t("history.metricSets")} />
          <MiniMetric value={reps30} label={t("history.metricReps")} />
        </div>
        {muscleSplit.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {muscleSplit.map((row) => (
              <div key={row.muscleGroup} className="flex items-center gap-2.5">
                <span className="w-16 shrink-0 truncate text-xs text-text-muted">
                  {t(`muscleGroups.${row.muscleGroup}`)}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${maxMuscle > 0 ? (row.volumeKg / maxMuscle) * 100 : 0}%` }}
                  />
                </span>
                <span className="numeric w-16 shrink-0 text-right text-xs text-text-muted">
                  {Math.round(unit === "kg" ? row.volumeKg : kgToLb(row.volumeKg)).toLocaleString()}{" "}
                  {unitLabel}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2.5 border-t border-border pt-3">
          <Icon name="award" size={14} className="shrink-0 text-accent" />
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted">
            {t("history.insightPrThisMonth")}
          </span>
          <span className="truncate text-[13px]">
            {pr
              ? `${pr.name} · ${displayWeight(pr.weightKg, unit)} × ${pr.reps}`
              : t("history.insightPrEmpty")}
          </span>
        </div>
      </Link>

      <Link to="/year-in-review" className={cardClass}>
        <CardHead label={t("history.insightRecapTitle", { year })} />
        <div className="grid grid-cols-4 divide-x divide-border">
          <MiniMetric value={thisYear.length} label={t("history.metricWorkouts")} />
          <MiniMetric value={yearSets} label={t("history.metricSets")} />
          <MiniMetric value={yearMinutes} label={t("history.metricMinutes")} />
          <MiniMetric value={yearVolumeDisplay} label={t("history.metricVolumeKg")} />
        </div>
      </Link>
    </div>
  );
}

// History — the log of record. Log mode is the browse surface (calendar,
// photos, chronological list); Insight mode groups the analytical
// satellites with live previews. The mode lives in `?view=` so
// back-navigation from Weight/Stats/Recap returns to Insight.
export function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const search = useSearch({ from: "/history" });
  const view = search.view ?? "log";
  const [showPhotos, setShowPhotos] = useState(true);
  const workouts = useWorkouts(200);

  const completed = useMemo(
    () => (workouts.data ?? []).filter((workout) => workout.status === "completed"),
    [workouts.data],
  );
  const groups = useMemo(() => groupByMonth(completed), [completed]);

  const setView = (next: "log" | "insight") => {
    void router.navigate({ to: "/history", search: { view: next }, replace: true });
  };

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-4">
      <h2 id="history-title" className="text-2xl font-semibold">
        {t("history.title")}
      </h2>

      <SegmentedControl
        label={t("history.view")}
        value={view}
        onChange={setView}
        variant="view"
        options={[
          { value: "log", label: t("history.log") },
          { value: "insight", label: t("history.insight") },
        ]}
      />

      {view === "insight" ? (
        <InsightCards />
      ) : (
        <>
          <div className="flex gap-2.5">
            <Link
              to="/calendar"
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[8px] bg-surface text-[13px]"
            >
              <Icon name="calendar" size={15} />
              {t("calendar.title")}
            </Link>
            <Link
              to="/photos"
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[8px] bg-surface text-[13px]"
            >
              <Icon name="image" size={15} />
              {t("photos.title")}
            </Link>
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
            <>
              {groups.map((group) => (
                <div key={group.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="px-1 text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted">
                      {group.label}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPhotos((v) => !v)}
                      className="flex items-center gap-1.5 rounded-[8px] bg-surface-2 px-3 py-1.5 text-[12px] text-text-muted hover:text-text"
                    >
                      <Icon name={showPhotos ? "image" : "x"} size={13} />
                      {showPhotos ? t("history.hidePhotos") : t("history.showPhotos")}
                    </button>
                  </div>
                  <Card className="overflow-hidden">
                    <ul className="divide-y divide-border">
                      {group.workouts.map((workout) => (
                        <li key={workout.id}>
                          <WorkoutRow workout={workout} showPhotos={showPhotos} />
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
