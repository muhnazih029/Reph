import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useRoutines, useCreateRoutine, useDeleteRoutine, useStartRoutine } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

export function RoutinesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const routines = useRoutines();
  const create = useCreateRoutine();
  const remove = useDeleteRoutine();
  const start = useStartRoutine();
  const [name, setName] = useState("");

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const r = await create.mutateAsync({ name: trimmed });
    setName("");
    void router.navigate({ to: "/routines/$id", params: { id: r.id } });
  };

  return (
    <section aria-labelledby="routines-title" className="flex flex-col gap-3">
      <h2 id="routines-title" className="text-xl font-medium">
        {t("routines.title")}
      </h2>

      <div className="flex gap-2">
        <input
          aria-label={t("routines.name")}
          placeholder={t("routines.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          className="min-h-11 flex-1 rounded-sm border border-border bg-surface px-3 text-sm"
        />
        <Button onClick={() => void submit()} disabled={!name.trim() || create.isPending}>
          {t("routines.create")}
        </Button>
      </div>

      {routines.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (routines.data ?? []).length === 0 ? (
        <EmptyState title={t("routines.empty")} body={t("routines.emptyBody")} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {(routines.data ?? []).map((routine) => (
              <li key={routine.id} className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    void router.navigate({ to: "/routines/$id", params: { id: routine.id } })
                  }
                >
                  <p className="truncate text-sm font-medium">{routine.name}</p>
                  <p className="text-xs text-text-muted">
                    {routine.entries.length} {t("routines.exercises")}
                  </p>
                </button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void start
                      .mutateAsync(routine.id)
                      .then(() => router.navigate({ to: "/workout/active" }))
                  }
                  disabled={start.isPending}
                >
                  {t("routines.start")}
                </Button>
                <button
                  type="button"
                  aria-label={t("routines.delete")}
                  className="min-h-9 min-w-9 text-danger"
                  onClick={() => void remove.mutateAsync(routine.id)}
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
