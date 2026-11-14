import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
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
import { Icon } from "../components/ui/Icon";
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
  const maxVolume = barData.reduce((max, row) => Math.max(max, row.volume), 0);

  return (
    <section aria-labelledby="stats-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Link
          to="/history"
          search={{ view: "insight" }}
          aria-label={t("weight.back")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Icon name="arrow-left" size={16} />
        </Link>
        <h2 id="stats-title" className="text-2xl font-semibold">
          {t("stats.title")}
        </h2>
      </div>

      <SegmentedControl
        variant="period"
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
          <Card className="flex items-center gap-8 p-4">
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="numeric text-xl font-semibold">{completed.length}</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.5px] text-text-muted">
                {t("stats.workouts")}
              </p>
            </div>
            <span className="h-9 w-px bg-border" />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="numeric text-xl font-semibold">
                {totalVolume.toLocaleString()}
                <span className="text-[13px] font-normal text-text-muted"> {unitLabel}</span>
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.5px] text-text-muted">
                {t("stats.totalVolume")}
              </p>
            </div>
          </Card>

          <Card className="flex flex-col gap-2.5 p-3">
            <h3 className="text-[13px] font-medium text-text">{t("stats.muscleVolume")}</h3>
            {barData.map((row) => (
              <div key={row.name} className="flex items-center gap-2.5">
                <span className="w-[110px] shrink-0 truncate text-[13px] text-text-muted">
                  {row.name}
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${maxVolume > 0 ? (row.volume / maxVolume) * 100 : 0}%` }}
                  />
                </span>
                <span className="numeric w-[70px] shrink-0 text-right text-[13px] text-text-muted">
                  {row.volume.toLocaleString()}
                </span>
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-2.5 p-3">
            <h3 className="text-[13px] font-medium text-text">{t("stats.strengthTrend")}</h3>
            <div className="relative">
              <select
                aria-label={t("stats.exercise")}
                value={selected ?? ""}
                onChange={(event) => setExerciseId(event.target.value)}
                className="min-h-11 w-full appearance-none rounded-sm border-0 bg-surface-2 px-3 pr-9 text-[13px] text-text"
              >
                {performedIds.map((id) => (
                  <option key={id} value={id}>
                    {exerciseName(id)}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                <Icon name="chevron-right" size={14} className="rotate-90" />
              </span>
            </div>
            {series.length === 0 ? (
              <p className="px-1 pb-2 text-sm text-text-muted">{t("stats.empty")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => format(new Date(v), "dd MMM")}
                  />
                  <YAxis
                    type="number"
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tick={{ fontSize: 10 }}
                    width={32}
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
              <p className="text-center text-[11px] text-text-muted">{t("stats.e1rmHint")}</p>
            ) : null}
          </Card>
        </>
      )}
    </section>
  );
}
