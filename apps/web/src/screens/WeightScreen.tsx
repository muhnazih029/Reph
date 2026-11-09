import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  useBodyMetrics,
  useCreateBodyMetric,
  useUpdateBodyMetric,
  useDeleteBodyMetric,
  useSettings,
} from "../api/hooks";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Input } from "../components/ui/Input";
import { Sheet } from "../components/ui/Sheet";
import { displayWeight, kgToLb, lbToKg } from "../lib/units";

type Point = { date: string; kg: number; id: string };

export function WeightScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const settings = useSettings();
  const unit = settings.data?.weightUnit ?? "kg";
  const metrics = useBodyMetrics();
  const create = useCreateBodyMetric();
  const update = useUpdateBodyMetric();
  const remove = useDeleteBodyMetric();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Point | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editDate, setEditDate] = useState("");

  const points: Point[] = useMemo(() => {
    const rows = (metrics.data ?? []).toSorted((a, b) => a.recordedAt - b.recordedAt);
    return rows
      .filter((r) => r.weightKg !== null)
      .map((r) => ({
        date: new Date(r.recordedAt).toLocaleDateString("en-CA").slice(0, 10),
        kg: r.weightKg as number,
        id: r.id,
      }));
  }, [metrics.data]);

  const chartData = useMemo(
    () => points.map((p) => ({ ...p, weight: unit === "kg" ? p.kg : kgToLb(p.kg) })),
    [points, unit],
  );

  const latest = points.length ? points[points.length - 1] : null;
  const prev = points.length > 1 ? points[points.length - 2] : null;
  const delta = latest && prev ? latest.kg - prev.kg : null;

  const submit = async () => {
    setError(null);
    const n = Number(weight);
    if (!isFinite(n) || n < 0 || weight.trim() === "") {
      setError(t("weight.invalid"));
      return;
    }
    const kg = unit === "kg" ? n : lbToKg(n);
    try {
      await create.mutateAsync({ weightKg: kg, recordedAt: new Date(date).getTime() });
      setWeight("");
      setDate(new Date().toISOString().slice(0, 10));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("weight.failed"));
    }
  };

  const openEdit = (p: Point) => {
    setEditing(p);
    setEditDate(p.date);
    setEditWeight(String(unit === "kg" ? p.kg : kgToLb(p.kg)));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const n = Number(editWeight);
    if (!isFinite(n) || n < 0) return;
    const kg = unit === "kg" ? n : lbToKg(n);
    await update.mutateAsync({
      id: editing.id,
      weightKg: kg,
      recordedAt: new Date(editDate).getTime(),
    });
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("weight.deleteConfirm"))) return;
    await remove.mutateAsync(id);
  };

  return (
    <section aria-labelledby="weight-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("weight.back")}
          onClick={() => void router.navigate({ to: "/history" })}
          className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          ←
        </button>
        <h2 id="weight-title" className="text-xl font-medium">
          {t("weight.weight")}
        </h2>
      </div>

      {latest ? (
        <Card className="flex items-center justify-between p-4">
          <div className="flex flex-col">
            <span className="text-xs text-text-muted">{t("weight.latest")}</span>
            <span className="text-2xl font-semibold">{displayWeight(latest.kg, unit)}</span>
          </div>
          {delta !== null ? (
            <span className={`text-sm ${delta <= 0 ? "text-accent" : "text-danger"}`}>
              {delta > 0 ? "+" : ""}
              {displayWeight(Math.abs(delta), unit)}
            </span>
          ) : null}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-11 flex-1"
          />
          <Input
            type="number"
            inputMode="decimal"
            placeholder={t("weight.weightPlaceholder")}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="min-h-11 flex-1"
            numeric
          />
        </div>
        <Button onClick={() => void submit()} disabled={create.isPending}>
          {create.isPending ? "…" : t("weight.add")}
        </Button>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </Card>

      {metrics.isPending ? (
        <Skeleton className="h-44 w-full" />
      ) : points.length === 0 ? (
        <EmptyState title={t("weight.empty")} body={t("weight.emptyBody")} />
      ) : (
        <Card className="p-3">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(e: any) => {
                const p = e?.activePayload?.[0]?.payload as (Point & { weight: number }) | undefined;
                if (p) openEdit(p);
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), "dd MMM")} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11 }} width={36} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0]?.payload as (Point & { weight: number }) | undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-sm border border-border bg-surface px-2 py-1 text-xs">
                      <div>{format(new Date(p.date), "dd MMM yyyy")}</div>
                      <div className="font-medium">{displayWeight(p.kg, unit)}</div>
                      <div className="text-text-muted">{t("weight.tapToEdit")}</div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--color-accent, #3b82f6)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs text-text-muted">{t("weight.chartHint")}</p>
        </Card>
      )}



      <Sheet
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={t("weight.edit")}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">{t("weight.date")}</span>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">{t("weight.weight")}</span>
            <Input
              type="number"
              inputMode="decimal"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              numeric
            />
          </label>
          <div className="flex gap-2">
            <Button
              onClick={() => void saveEdit()}
              disabled={update.isPending || !editWeight.trim()}
            >
              {t("weight.save")}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t("weight.cancel")}
            </Button>
          </div>
          <button
            type="button"
            className="self-start text-sm text-danger"
            onClick={() => {
              if (editing) void handleDelete(editing.id).then(() => setEditing(null));
            }}
          >
            {t("weight.delete")}
          </button>
        </div>
      </Sheet>
    </section>
  );
}
