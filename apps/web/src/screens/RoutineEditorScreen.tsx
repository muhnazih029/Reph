import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useRoutine, useDeleteRoutine } from "../api/hooks";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

export function RoutineEditorScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const routine = useRoutine(id);
  const remove = useDeleteRoutine();
  const [name, setName] = useState("");

  useEffect(() => {
    if (routine.data) setName(routine.data.name);
  }, [routine.data]);

  if (routine.isPending) return <Skeleton className="h-40 w-full" />;
  if (!routine.data) return <EmptyState title={t("routines.notFound")} />;

  return (
    <section aria-labelledby="routine-editor-title" className="flex flex-col gap-3">
      <h2 id="routine-editor-title" className="text-xl font-medium">
        {t("routines.edit")}
      </h2>
      <Card className="flex flex-col gap-2 p-4">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("routines.name")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm"
          />
        </label>
        <p className="text-xs text-text-muted">
          {routine.data.entries.length} {t("routines.exercises")} ·{" "}
          {routine.data.entries.reduce((n, e) => n + e.sets.length, 0)} {t("routines.sets")}
        </p>
      </Card>
      <Button
        variant="danger"
        onClick={() => void remove.mutateAsync(id).then(() => router.navigate({ to: "/routines" }))}
      >
        {t("routines.delete")}
      </Button>
    </section>
  );
}
