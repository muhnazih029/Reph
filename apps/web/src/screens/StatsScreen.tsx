import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useExercises, useSettings, useWorkouts } from "../api/hooks";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { displayWeight, kgToLb } from "../lib/units";
import {
  STATS_PERIODS,
  completedSince,
  mostPerformedExercise,
  periodStart,
  strengthSeries,
  volumeByMuscleGroup,
  type StatsPeriod,
} from "../lib/stats";

// Stats — the analytical view of the workout log. Everything is derived
// client-side from the cached workouts + exercise library, so there is no
// dedicated stats endpoint. Two views: volume per muscle group (bar chart)
// and strength trend per exercise (e1RM line chart, Epley). Canonical
// storage is kg; display units follow settings.

export function StatsScreen() {
  const { t } = useTranslation();
  const workouts = useWorkouts(1000);
  const exercises = useExercises();
  const settings = useSettings();
  const unit = settings.data?.weightUnit ?? "kg";
  const [period, setPeriod] = useState<StatsPeriod>("90d");
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const since = periodStart(period);
  const completed = useMemo(
    () => completedSince(workouts.data ?? [], since),
    [workouts.data, since],
  );

  const muscleGroup = (id: string): string =>
    exercises.data?.find((exercise) => exercise.id === id)?.muscleGroup ?? "other";
  const exerciseName = (id: string): string =>
    exercises.data?.find((exercise) => exercise.id === id)?.name ?? t("common.loading");

  const volumes = useMemo(
    () => volumeByMuscleGroup(completed, muscleGroup),
    // muscleGroup reads exercises.data — redeclare deps honestly
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completed, exercises.data],
  );

  const performedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const workout of completed) {
      for (const entry of workout.entries) ids.add(entry.exerciseId);
    }
    return [...ids].toSorted((a, b) => exerciseName(a).localeCompare(exerciseName(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, exercises.data]);

  const defaultSelected = useMemo(() => mostPerformedExercise(completed), [completed]);
  const selected = exerciseId ?? defaultSelected;
  const series = useMemo(
    () =>
      selected
        ? strengthSeries(completed, selected).map((point) => ({
            time: point.time,
            oneRM: unit === "kg" ? point.oneRM : kgToLb(point.oneRM),
          }))
        : [],
    [completed, selected, unit],
  );

  const volumeDisplay = (volumeKg: number): number =>
    Math.round(unit === "kg" ? volumeKg : kgToLb(volumeKg));
  const unitLabel = unit === "kg" ? "kg" : "lb";
  const totalVolume = Math.round(
    unit === "kg"
      ? volumes.reduce((sum, row) => sum + row.volumeKg, 0)
      : kgToLb(volumes.reduce((sum, row) => sum + row.volumeKg, 0)),
  );

  const barData = volumes.map((row) => ({
    name: t(`muscleGroups.${row.muscleGroup}`),
    volume: volumeDisplay(row.volumeKg),
  }));

  return (
    <section aria-labelledby="stats-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link
          to="/history"
          search={{ view: "insight" }}
          aria-label={t("weight.back")}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          ←
        </Link>
        <h2 id="stats-title" className="text-xl font-medium">
          {t("stats.title")}
        </h2>
      </div>

      <SegmentedControl
        label={t("stats.period")}
        value={period}
        onChange={setPeriod}
        options={STATS_PERIODS.map((value) => ({
          value,
          label: t(`stats.period.${value}`),
        }))}
      />

      {workouts.isPending ? (
        <>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </>
      ) : completed.length === 0 ? (
        <Card className="p-4">
          <EmptyState title={t("stats.empty")} />
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap gap-4 p-4 text-sm">
            <div>
              <p className="numeric text-lg font-semibold">{completed.length}</p>
              <p className="text-xs text-text-muted">{t("stats.workouts")}</p>
            </div>
            <div>
              <p className="numeric text-lg font-semibold">
                {totalVolume}
                <span className="text-xs"> {unitLabel}</span>
              </p>
              <p className="text-xs text-text-muted">{t("stats.totalVolume")}</p>
            </div>
          </Card>

          <Card className="p-3">
            <h3 className="px-1 pb-2 text-sm font-medium text-text">{t("stats.muscleVolume")}</h3>
            <div style={{ height: `${barData.length * 32 + 8}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-surface-2, rgba(0,0,0,0.05))" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as
                        | { name: string; volume: number }
                        | undefined;
                      if (!row) return null;
                      return (
                        <div className="rounded-sm border border-border bg-surface px-2 py-1 text-xs">
                          <div>{row.name}</div>
                          <div className="font-medium">
                            {row.volume} {unitLabel}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="volume" radius={[0, 4, 4, 0]} fill="var(--color-accent, #3b82f6)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="flex flex-col gap-2 p-3">
            <h3 className="px-1 text-sm font-medium text-text">{t("stats.strengthTrend")}</h3>
            <label className="flex flex-col gap-1 px-1 text-xs text-text-muted">
              {t("stats.exercise")}
              <select
                value={selected ?? ""}
                onChange={(event) => setExerciseId(event.target.value)}
                className="min-h-9 rounded-sm border border-border bg-surface px-2 text-sm text-text"
              >
                {performedIds.map((id) => (
                  <option key={id} value={id}>
                    {exerciseName(id)}
                  </option>
                ))}
              </select>
            </label>
            {series.length === 0 ? (
              <p className="px-1 pb-2 text-sm text-text-muted">{t("stats.empty")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => format(new Date(v), "dd MMM")}
                  />
                  <YAxis
                    type="number"
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tick={{ fontSize: 11 }}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]?.payload as
                        | { time: number; oneRM: number }
                        | undefined;
                      if (!point) return null;
                      return (
                        <div className="rounded-sm border border-border bg-surface px-2 py-1 text-xs">
                          <div>{format(new Date(point.time), "dd MMM yyyy")}</div>
                          <div className="font-medium">
                            e1RM {displayWeight(Math.round(point.oneRM * 10) / 10, unit)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="oneRM"
                    dot={{ r: 4 }}
                    stroke="var(--color-accent, #3b82f6)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {series.length > 0 ? (
              <p className="px-1 pb-1 text-center text-xs text-text-muted">{t("stats.e1rmHint")}</p>
            ) : null}
          </Card>
        </>
      )}
    </section>
  );
}
