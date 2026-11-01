import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useRoutine, useExercises, useUpdateRoutine, useDeleteRoutine } from "../api/hooks";
import { ExercisePicker } from "../components/workout/ExercisePicker";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import type { Routine } from "@reph/contracts";

export function RoutineEditorScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const routine = useRoutine(id);
  const exercises = useExercises();
  const update = useUpdateRoutine(id);
  const remove = useDeleteRoutine();
  const [draft, setDraft] = useState<Routine | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (routine.data) setDraft(routine.data);
  }, [routine.data]);

  if (routine.isPending) return <Skeleton className="h-40 w-full" />;
  if (!routine.data || !draft) return <EmptyState title={t("routines.notFound")} />;

  const exerciseName = (eid: string) => exercises.data?.find((e) => e.id === eid)?.name ?? eid;

  const addEntry = (exerciseId: string) => {
    setDraft((d) => {
      if (!d) return d;
      const entry = {
        id: crypto.randomUUID(),
        exerciseId,
        position: d.entries.length,
        notes: "",
        supersetId: null,
        sets: [
          {
            id: crypto.randomUUID(),
            position: 0,
            type: "normal" as const,
            reps: null,
            weightKg: null,
            durationSeconds: null,
            distanceMeters: null,
            rpe: null,
          },
        ],
      };
      return { ...d, entries: [...d.entries, entry] };
    });
    setPickerOpen(false);
  };

  const addSet = (entryId: string) => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        entries: d.entries.map((e) => {
          if (e.id !== entryId) return e;
          const s = {
            id: crypto.randomUUID(),
            position: e.sets.length,
            type: "normal" as const,
            reps: null,
            weightKg: null,
            durationSeconds: null,
            distanceMeters: null,
            rpe: null,
          };
          return { ...e, sets: [...e.sets, s] };
        }),
      };
    });
  };

  const removeSet = (entryId: string, setId: string) => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        entries: d.entries.map((e) => {
          if (e.id !== entryId) return e;
          return { ...e, sets: e.sets.filter((s) => s.id !== setId) };
        }),
      };
    });
  };

  const removeEntry = (entryId: string) => {
    setDraft((d) => (d ? { ...d, entries: d.entries.filter((e) => e.id !== entryId) } : d));
  };

  const updateSet = (
    entryId: string,
    setId: string,
    patch: Partial<Routine["entries"][number]["sets"][number]>,
  ) => {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        entries: d.entries.map((e) => {
          if (e.id !== entryId) return e;
          return { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) };
        }),
      };
    });
  };

  const save = () => {
    if (!draft) return;
    void update.mutateAsync({
      expectedUpdatedAt: draft.updatedAt,
      name: draft.name,
      entries: draft.entries,
    });
  };

  return (
    <section aria-labelledby="routine-editor-title" className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void router.navigate({ to: "/history" })}
        className="min-h-9 self-start text-sm text-text-muted"
      >
        ← {t("common.back")}
      </button>
      <h2 id="routine-editor-title" className="text-xl font-medium">
        {t("routines.edit")}
      </h2>

      <Card className="flex flex-col gap-2 p-4">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          {t("routines.name")}
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm"
          />
        </label>
      </Card>

      {draft.entries.length === 0 ? (
        <EmptyState title={t("routines.emptyEntries")} body={t("routines.emptyEntriesBody")} />
      ) : (
        draft.entries.map((entry) => (
          <Card key={entry.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{exerciseName(entry.exerciseId)}</span>
              <button type="button" className="text-danger" onClick={() => removeEntry(entry.id)}>
                ×
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {entry.sets.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="numeric w-6 text-xs text-text-muted">{i + 1}</span>
                  <input
                    type="number"
                    placeholder="kg"
                    value={s.weightKg ?? ""}
                    onChange={(e) =>
                      updateSet(entry.id, s.id, {
                        weightKg: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="h-9 w-20 rounded-sm border border-border bg-surface px-2 text-sm"
                  />
                  <span className="text-xs text-text-muted">×</span>
                  <input
                    type="number"
                    placeholder="reps"
                    value={s.reps ?? ""}
                    onChange={(e) =>
                      updateSet(entry.id, s.id, {
                        reps: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="h-9 w-16 rounded-sm border border-border bg-surface px-2 text-sm"
                  />
                  <button
                    type="button"
                    className="text-danger"
                    onClick={() => removeSet(entry.id, s.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={() => addSet(entry.id)}>
              {t("routines.addSet")}
            </Button>
          </Card>
        ))
      )}

      <Button onClick={() => setPickerOpen(true)}>{t("routines.addExercise")}</Button>
      <Button onClick={save} loading={update.isPending}>
        {t("common.save")}
      </Button>
      <Button
        variant="danger"
        onClick={() => void remove.mutateAsync(id).then(() => router.navigate({ to: "/history" }))}
      >
        {t("routines.delete")}
      </Button>

      <ExercisePicker open={pickerOpen} onOpenChange={setPickerOpen} onSelect={addEntry} />
    </section>
  );
}
