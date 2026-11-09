import type { Workout, MuscleGroup } from "@reph/contracts";
import { format } from "date-fns";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { useBodyMetrics, useExercises, useSettings, useWorkouts } from "../api/hooks";
import { Card } from "../components/ui/Card";
import { WorkoutRow } from "../components/history/WorkoutRow";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { displayWeight, kgToLb } from "../lib/units";
import { completedSince, volumeByMuscleGroup, workoutVolumeKg } from "../lib/stats";

type MonthGroup = { label: string; workouts: Workout[] };

function groupByMonth(workouts: Workout[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const workout of workouts) {
    const label = format(workout.startTime, "LLLL yyyy");
    const group = groups.get(label) ?? { label, workouts: [] };
    group.workouts.push(workout);
  }
  return Array.from(groups.values());
}

const DAY = 86_400_000;

// A 96×28 inline SVG sparkline — kept dependency-free on purpose; the
// Weight screen is the place for the full interactive chart.
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="h-7 w-24" />;
  const width = 96;
  const height = 28;
  const pad = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (points.length - 1);
  const coords = points
    .map((p, i) => `${pad + i * stepX},${height - pad - ((p - min) / span) * (height - pad * 2)}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke="var(--color-accent, #3b82f6)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
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

  const completed = useMemo(
    () => (workouts.data ?? []).filter((workout) => workout.status === "completed"),
    [workouts.data],
  );
  const cutoff = Date.now() - 30 * DAY;
  const recent = useMemo(() => completedSince(completed, cutoff), [completed, cutoff]);

  const exerciseMuscleGroup = (id: string): string =>
    exercises.data?.find((exercise) => exercise.id === id)?.muscleGroup ?? "other";
  const topMuscle = useMemo(
    () =>
      volumeByMuscleGroup(recent, exerciseMuscleGroup)[0]?.muscleGroup as MuscleGroup | undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recent, exercises.data],
  );
  const volume30 = useMemo(
    () => recent.reduce((sum, workout) => sum + workoutVolumeKg(workout), 0),
    [recent],
  );
  const volume30Display = Math.round(unit === "kg" ? volume30 : kgToLb(volume30));

  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();
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

  const weights = useMemo(
    () =>
      (metrics.data ?? [])
        .filter((row) => row.weightKg !== null)
        .toSorted((a, b) => a.recordedAt - b.recordedAt),
    [metrics.data],
  );
  const latestWeight = weights.at(-1)?.weightKg ?? null;
  const weight30 = weights.filter((row) => row.recordedAt >= cutoff);
  const first30 = weight30.at(0);
  const delta =
    latestWeight !== null && first30 && latestWeight - first30.weightKg! !== 0
      ? latestWeight - first30.weightKg!
      : null;
  const deltaPrefix = delta !== null && delta >= 0 ? "+" : "-";
  const sparkPoints = weights.slice(-12).map((row) => row.weightKg!);

  const cardClass =
    "flex items-center justify-between gap-3 rounded-radius border border-border bg-surface p-4 text-left hover:bg-surface-2";

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
    <div className="flex flex-col gap-2">
      <Link to="/weight" className={cardClass}>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("history.insightWeightTitle")}
          </span>
          <span className="numeric text-2xl font-semibold">
            {latestWeight !== null ? displayWeight(latestWeight, unit) : "—"}
          </span>
          <span className="truncate text-xs text-text-muted">
            {latestWeight === null
              ? t("history.insightWeightEmpty")
              : delta === null
                ? t("history.insightLast30")
                : `${deltaPrefix}${displayWeight(Math.abs(delta), unit)} · ${t("history.insightLast30")}`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Sparkline points={sparkPoints} />
          <span className="text-text-muted">›</span>
        </span>
      </Link>

      <Link to="/stats" className={cardClass}>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("history.insightStatsTitle")}
          </span>
          <span className="numeric text-2xl font-semibold">
            {volume30Display}
            <span className="text-sm"> {unitLabel}</span>
          </span>
          <span className="truncate text-xs text-text-muted">
            {topMuscle ? `${t(`muscleGroups.${topMuscle}`)} · ` : ""}
            {t("history.insightLast30")}
          </span>
        </span>
        <span className="shrink-0 text-text-muted">›</span>
      </Link>

      <Link to="/year-in-review" className={cardClass}>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("history.insightRecapTitle", { year })}
          </span>
          <span className="numeric text-2xl font-semibold">{thisYear.length}</span>
          <span className="truncate text-xs text-text-muted">
            {t("history.insightRecapMeta", { sets: yearSets, minutes: yearMinutes })}
          </span>
        </span>
        <span className="shrink-0 text-text-muted">›</span>
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
    <section aria-labelledby="history-title" className="flex flex-col gap-3">
      <h2 id="history-title" className="text-xl font-medium">
        {t("history.title")}
      </h2>

      <SegmentedControl
        label={t("history.view")}
        value={view}
        onChange={setView}
        options={[
          { value: "log", label: t("history.log") },
          { value: "insight", label: t("history.insight") },
        ]}
      />

      {view === "insight" ? (
        <InsightCards />
      ) : (
        <>
          <div className="flex gap-2">
            <Link
              to="/calendar"
              className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-center text-sm"
            >
              {t("calendar.title")}
            </Link>
            <Link
              to="/photos"
              className="flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-center text-sm"
            >
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
            groups.map((group) => (
              <div key={group.label}>
                <h3 className="mt-2 px-1 text-sm font-medium uppercase tracking-wide text-text-muted">
                  {group.label}
                </h3>
                <Card className="mt-1 overflow-hidden">
                  <ul className="divide-y divide-border">
                    {group.workouts.map((workout) => (
                      <li key={workout.id}>
                        <WorkoutRow workout={workout} />
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}
