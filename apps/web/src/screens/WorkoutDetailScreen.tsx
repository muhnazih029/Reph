import type { UpdateWorkoutInput, Workout, WorkoutSet } from "@reph/contracts";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import {
  useDeleteWorkout,
  useExercise,
  useSettings,
  useUpdateWorkout,
  useUploadPhoto,
  useWorkout,
  usePhotos,
} from "../api/hooks";
import type { ApiError } from "../api/client";
import { workoutVolumeKg } from "../lib/stats";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Sheet } from "../components/ui/Sheet";
import { Skeleton } from "../components/ui/Skeleton";
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
  const workout = useWorkout(id);
  const settings = useSettings();
  const update = useUpdateWorkout(id);
  const deleteWorkout = useDeleteWorkout();
  const uploadPhoto = useUploadPhoto();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photos = usePhotos(8);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Workout | null>(null);
  const [conflict, setConflict] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        <Button variant="secondary" onClick={() => void router.navigate({ to: "/history" })}>
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
          onClick={() => void router.navigate({ to: "/history" })}
          className="min-h-9 min-w-9 text-lg text-text-muted"
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
          />
        ) : (
          <h2 id="workout-detail-title" className="min-w-0 flex-1 truncate text-xl font-medium">
            {data.title === "" ? t("workout.titlePlaceholder") : data.title}
          </h2>
        )}
        {editing ? (
          <>
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
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={startEditing}>
              {t("detail.edit")}
            </Button>
            <Button variant="secondary" onClick={() => photoInputRef.current?.click()}>
              {t("photos.upload")}
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto.mutateAsync(f);
                e.target.value = "";
              }}
            />
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              {t("common.delete")}
            </Button>
          </>
        )}
      </div>

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

      {editing ? (
        <div className="flex flex-col gap-3">
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
        </div>
      ) : data.notes !== "" ? (
        <Card className="p-4 text-sm text-text-muted">{data.notes}</Card>
      ) : null}

      {(photos.data ?? []).length > 0 ? (
        <div>
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-text-muted">
            {t("photos.title")}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(photos.data ?? []).map((p) => (
              <img
                key={p.id}
                src={`/api/v1/photos/${p.id}/image`}
                alt=""
                className="aspect-square w-full rounded-sm object-cover"
              />
            ))}
          </div>
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
                  .then(() => void router.navigate({ to: "/history" }));
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
