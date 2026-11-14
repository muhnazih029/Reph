import type { UpdateWorkoutInput, Workout, WorkoutSet } from "@reph/contracts";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearch } from "@tanstack/react-router";
import {
  useDeleteWorkout,
  useExercise,
  useSettings,
  useUpdateWorkout,
  useUploadPhoto,
  useWorkout,
  usePhotos,
  useDeletePhoto,
} from "../api/hooks";
import type { ApiError } from "../api/client";
import { workoutVolumeKg } from "../lib/stats";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { Input } from "../components/ui/Input";
import { Sheet } from "../components/ui/Sheet";
import { Skeleton } from "../components/ui/Skeleton";
import { compressImage } from "../lib/image";
import { EntryCard } from "../components/workout/EntryCard";

// Workout detail — stats strip, read-only EntryCards, inline edit mode
// (set edits collect in a local draft; Save PATCHes the nested payload
// with expectedUpdatedAt; 409 → conflict prompt with reload), and a
// confirm-delete that navigates back to history (Task 10).

function formatDuration(workout: Workout, minutesLabel: string): string {
  if (workout.endTime === null) return "–";
  return `${Math.max(1, Math.round((workout.endTime - workout.startTime) / 60_000))} ${minutesLabel}`;
}

// per-entry wrapper so each entry can resolve its exercise (hook per child)
function DetailEntry(props: {
  entry: Workout["entries"][number];
  weightUnit: "kg" | "lbs";
  distanceUnit: "km" | "mi";
  readOnly: boolean;
  onSetPatch?: (setId: string, patch: Partial<WorkoutSet>) => void;
  onRemoveSet?: (setId: string) => void;
}) {
  const exercise = useExercise(props.entry.exerciseId);
  return (
    <EntryCard
      entry={props.entry}
      exercise={exercise.data}
      entries={[]}
      weightUnit={props.weightUnit}
      distanceUnit={props.distanceUnit}
      readOnly={props.readOnly}
      onSetPatch={props.onSetPatch}
      onRemoveSet={props.onRemoveSet}
    />
  );
}

function draftToPayload(draft: Workout, server: Workout): UpdateWorkoutInput {
  return {
    expectedUpdatedAt: server.updatedAt,
    title: draft.title,
    notes: draft.notes,
    bodyWeightKg: draft.bodyWeightKg,
    entries: draft.entries,
  };
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-1 py-1">
      <p className="numeric text-base">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

export function WorkoutDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const search = useSearch({ from: "/workouts/$id" });
  const backTo = search.from === "home" ? "/" : "/history";
  const workout = useWorkout(id);
  const settings = useSettings();
  const update = useUpdateWorkout(id);
  const deleteWorkout = useDeleteWorkout();
  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photos = usePhotos(8, 0, id);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Workout | null>(null);
  const [conflict, setConflict] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  if (workout.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (workout.error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-sm text-text-muted">
          {workout.error instanceof Error ? workout.error.message : t("common.loading")}
        </p>
        <Button variant="secondary" onClick={() => void router.navigate({ to: backTo })}>
          {t("detail.backToHistory")}
        </Button>
      </div>
    );
  }

  const data = workout.data;
  if (!data) return null;

  const totalSets = data.entries.reduce(
    (count, entry) => count + entry.sets.filter((set) => set.done).length,
    0,
  );
  const totalReps = data.entries.reduce(
    (count, entry) =>
      count + entry.sets.filter((set) => set.done).reduce((sum, set) => sum + (set.reps ?? 0), 0),
    0,
  );

  const startEditing = () => {
    setDraft(structuredClone(data));
    setConflict(false);
    setEditing(true);
  };

  const saveDraft = () => {
    if (!draft) return;
    update.mutate(draftToPayload(draft, data), {
      onSuccess: () => {
        setDraft(null);
        setEditing(false);
      },
      onError: (error) => {
        if ((error as ApiError).code === "conflict") setConflict(true);
      },
    });
  };

  const patchDraftSet = (
    setId: string,
    patch: Partial<Workout["entries"][number]["sets"][number]>,
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const clone = structuredClone(current);
      for (const entry of clone.entries) {
        const set = entry.sets.find((candidate) => candidate.id === setId);
        if (set) Object.assign(set, patch);
      }
      return clone;
    });
  };

  const removeDraftSet = (setId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const clone = structuredClone(current);
      for (const entry of clone.entries) {
        entry.sets = entry.sets.filter((candidate) => candidate.id !== setId);
      }
      clone.entries = clone.entries.filter((entry) => entry.sets.length > 0);
      return clone;
    });
  };

  return (
    <section aria-labelledby="workout-detail-title" className="flex flex-col gap-3">
      {conflict ? (
        <div role="alert" className="rounded-sm bg-warning/10 px-3 py-3 text-sm text-warning">
          <p>{t("detail.conflictTitle")}</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void workout.refetch().then(() => {
                  setConflict(false);
                  setEditing(false);
                });
              }}
            >
              {t("detail.reload")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => {
            if (editing) {
              const ok = window.confirm(t("detail.discardChanges"));
              if (!ok) return;
              setEditing(false);
              setDraft(data);
            }
            void router.navigate({ to: backTo });
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          ←
        </button>
        {editing ? (
          <Input
            aria-label={t("workout.title")}
            defaultValue={draft?.title ?? data.title}
            onBlur={(event) =>
              setDraft((current) => (current ? { ...current, title: event.target.value } : current))
            }
            className="flex-1"
          />
        ) : (
          <h2 id="workout-detail-title" className="min-w-0 flex-1 truncate text-xl font-semibold">
            {data.title === "" ? t("workout.titlePlaceholder") : data.title}
          </h2>
        )}
        {editing ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={() => photoInputRef.current?.click()}>
              {t("photos.upload")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(null);
                setEditing(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button loading={update.isPending} onClick={saveDraft}>
              {t("common.save")}
            </Button>
          </div>
        ) : (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={t("common.moreActions")}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-surface text-text-muted hover:text-text"
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
                  className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-radius border border-border bg-surface p-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      startEditing();
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-text hover:bg-surface-2"
                  >
                    <Icon name="pencil" size={16} className="text-accent" />
                    {t("detail.edit")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-sm bg-accent/10 px-3 py-2 text-sm text-text hover:bg-accent/20"
                  >
                    <Icon name="trash-2" size={16} className="text-accent" />
                    {t("common.delete")}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {editing ? (
        <Input
          aria-label={t("workout.notes")}
          defaultValue={draft?.notes ?? ""}
          placeholder={t("workout.notes")}
          onBlur={(event) =>
            setDraft((current) => (current ? { ...current, notes: event.target.value } : current))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      ) : null}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f)
            void compressImage(f).then((cf) =>
              uploadPhoto.mutateAsync({ file: cf, workoutId: id }),
            );
          e.target.value = "";
        }}
      />

      <Card className="grid grid-cols-4 divide-x divide-border overflow-hidden py-2 text-center">
        <StatCell
          label={t("detail.duration")}
          value={formatDuration(data, t("common.minutesShort"))}
        />
        <StatCell label={t("detail.volume")} value={String(Math.round(workoutVolumeKg(data)))} />
        <StatCell label={t("detail.sets")} value={String(totalSets)} />
        <StatCell label={t("detail.reps")} value={String(totalReps)} />
      </Card>

      {(editing ? (draft?.entries ?? []) : data.entries).map((entry) => (
        <DetailEntry
          key={entry.id}
          entry={entry}
          weightUnit={settings.data?.weightUnit ?? "kg"}
          distanceUnit={settings.data?.distanceUnit ?? "km"}
          readOnly={!editing}
          onSetPatch={editing ? patchDraftSet : undefined}
          onRemoveSet={editing ? removeDraftSet : undefined}
        />
      ))}

      {data.notes !== "" ? <Card className="p-4 text-sm text-text-muted">{data.notes}</Card> : null}

      {(photos.data ?? []).length > 0 ? (
        <div>
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("photos.title")}
          </p>
          <div className="grid grid-cols-4 gap-2 md:max-w-[480px]">
            {(photos.data ?? []).map((p) => (
              <div key={p.id} className="relative">
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(p.id)}
                  className="block w-full"
                >
                  <img
                    src={`/api/v1/photos/${p.id}/image`}
                    alt=""
                    className="aspect-square w-full rounded object-cover"
                    loading="lazy"
                  />
                </button>
                {editing ? (
                  <button
                    type="button"
                    aria-label={t("photos.delete")}
                    onClick={() => {
                      const ok = window.confirm(t("photos.deleteConfirm"));
                      if (!ok) return;
                      void deletePhoto.mutateAsync(p.id);
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {previewPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <img
            src={`/api/v1/photos/${previewPhoto}/image`}
            alt=""
            className="max-h-full max-w-full rounded"
          />
        </div>
      ) : null}

      <Sheet open={deleteOpen} onOpenChange={setDeleteOpen} title={t("common.delete")}>
        <div className="flex flex-col gap-3 pb-3">
          <p className="text-sm text-text-muted">{t("detail.deleteConfirm")}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleteWorkout.isPending}
              onClick={() => {
                void deleteWorkout
                  .mutateAsync(data.id)
                  .then(() => void router.navigate({ to: backTo }));
              }}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </Sheet>
    </section>
  );
}
