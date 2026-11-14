import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useRoutine, useExercises, useUpdateRoutine, useDeleteRoutine } from "../api/hooks";
import { ExercisePicker } from "../components/workout/ExercisePicker";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    <section aria-labelledby="routine-editor-title" className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => void router.navigate({ to: "/workout", search: { tab: "routines" } })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Icon name="arrow-left" size={18} />
        </button>
        <h2 id="routine-editor-title" className="min-w-0 flex-1 truncate text-2xl font-semibold">
          {t("routines.edit")}
        </h2>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={t("common.moreActions")}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <Icon name="more-horizontal" size={18} />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 top-12 z-40 w-[180px] overflow-hidden rounded-radius border border-border bg-surface p-1.5"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void save();
                  }}
                  disabled={update.isPending}
                  className="flex w-full items-center gap-2.5 rounded-sm px-3 py-[9px] text-[13px] text-text hover:bg-surface-2 disabled:opacity-60"
                >
                  <Icon name="check" size={15} className="text-accent" />
                  {t("common.save")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void remove
                      .mutateAsync(id)
                      .then(() => router.navigate({ to: "/workout", search: { tab: "routines" } }));
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm bg-accent/10 px-3 py-[9px] text-[13px] text-text hover:bg-accent/20"
                >
                  <Icon name="trash-2" size={15} className="text-accent" />
                  {t("routines.delete")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <Card className="flex items-center gap-4 p-[18px]">
        <span className="shrink-0 text-[13px] text-text-muted">{t("routines.name")}</span>
        <input
          aria-label={t("routines.name")}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="min-h-11 w-full max-w-[360px] rounded-sm border border-border bg-surface px-3.5 text-sm"
        />
      </Card>

      {draft.entries.length === 0 ? (
        <EmptyState title={t("routines.emptyEntries")} body={t("routines.emptyEntriesBody")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3 md:items-start">
          {draft.entries.map((entry) => (
            <Card key={entry.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {exerciseName(entry.exerciseId)}
                </span>
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  onClick={() => removeEntry(entry.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-surface-2 text-text-muted hover:text-text"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <span className="w-5 shrink-0">{t("workout.setShort")}</span>
                <span className="min-w-0 flex-1">{t("workout.weightShort")}</span>
                <span className="w-2 shrink-0" />
                <span className="min-w-0 flex-1">{t("workout.repsShort")}</span>
                <span className="w-6 shrink-0" />
              </div>
              <div className="flex flex-col gap-2">
                {entry.sets.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="numeric w-5 shrink-0 text-xs text-text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label={t("workout.weight")}
                        placeholder="kg"
                        value={s.weightKg ?? ""}
                        onChange={(e) =>
                          updateSet(entry.id, s.id, {
                            weightKg: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="numeric h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm"
                      />
                    </div>
                    <span className="w-2 shrink-0 text-center text-xs text-text-muted">×</span>
                    <div className="min-w-0 flex-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={t("workout.reps")}
                        placeholder={t("workout.repsShort")}
                        value={s.reps ?? ""}
                        onChange={(e) =>
                          updateSet(entry.id, s.id, {
                            reps: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="numeric h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={t("workout.deleteSet")}
                      onClick={() => removeSet(entry.id, s.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-text-muted hover:bg-surface-2 hover:text-text"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                className="min-h-9 text-[13px]"
                onClick={() => addSet(entry.id)}
              >
                {t("routines.addSet")}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Button
        variant="secondary"
        className="w-full rounded-[10px] px-[18px] text-[13px] md:w-auto md:self-start"
        onClick={() => setPickerOpen(true)}
      >
        {t("routines.addExercise")}
      </Button>

      <ExercisePicker open={pickerOpen} onOpenChange={setPickerOpen} onSelect={addEntry} />
    </section>
  );
}
