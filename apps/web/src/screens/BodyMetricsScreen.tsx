import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useBodyMetrics, useCreateBodyMetric, useDeleteBodyMetric } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

export function BodyMetricsScreen() {
  const { t } = useTranslation();
  const metrics = useBodyMetrics();
  const create = useCreateBodyMetric();
  const remove = useDeleteBodyMetric();
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");

  const submit = async () => {
    const w = weight.trim() === "" ? null : Number(weight);
    const b = bf.trim() === "" ? null : Number(bf);
    if (w === null && b === null) return;
    await create.mutateAsync({ weightKg: w, bodyFatPct: b });
    setWeight("");
    setBf("");
  };

  return (
    <section aria-labelledby="bodymetrics-title" className="flex flex-col gap-3">
      <h2 id="bodymetrics-title" className="text-xl font-medium">
        {t("bodyMetrics.title")}
      </h2>

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t("bodyMetrics.weight")}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="min-h-11 flex-1 rounded-sm border border-border bg-surface px-3 text-sm"
          />
          <input
            type="number"
            placeholder={t("bodyMetrics.bodyFat")}
            value={bf}
            onChange={(e) => setBf(e.target.value)}
            className="min-h-11 flex-1 rounded-sm border border-border bg-surface px-3 text-sm"
          />
        </div>
        <Button onClick={() => void submit()} disabled={create.isPending}>
          {t("bodyMetrics.add")}
        </Button>
      </Card>

      {metrics.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : (metrics.data ?? []).length === 0 ? (
        <EmptyState title={t("bodyMetrics.empty")} body={t("bodyMetrics.emptyBody")} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {(metrics.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm">
                    {m.weightKg !== null ? `${m.weightKg} kg` : "–"}
                    {m.bodyFatPct !== null ? ` · ${m.bodyFatPct}%` : ""}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(m.recordedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={t("bodyMetrics.delete")}
                  className="min-h-9 min-w-9 text-danger"
                  onClick={() => void remove.mutateAsync(m.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
