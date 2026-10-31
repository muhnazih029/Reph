import type { Exercise, WorkoutEntry, WorkoutSet } from "@reph/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkouts } from "../../api/hooks";
import { useActiveWorkoutStore } from "../../stores/activeWorkout";
import { useRestTimerStore } from "../../stores/restTimer";
import { previousPerformance } from "../../lib/stats";
import { displayWeight } from "../../lib/units";
import { Input } from "../ui/Input";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { SetRow } from "./SetRow";
import { ExercisePicker } from "./ExercisePicker";

// One exercise block of the active workout — header popover (previous
// performance + repeat prefill), superset badge, collapsible notes,
// "+ Add set" (starts the rest timer when the previous set was done), and
// the ⋯ menu (superset with sibling, replace exercise, move, delete) —
// Task 9 (docs/plans/phase-1-mvp.md).

export function EntryCard({
  entry,
  exercise,
  entries,
  weightUnit,
  distanceUnit,
  disabled = false,
  readOnly = false,
  onSetPatch,
  onRemoveSet,
}: {
  entry: WorkoutEntry;
  exercise: Exercise | undefined;
  entries: WorkoutEntry[];
  weightUnit: "kg" | "lbs";
  distanceUnit: "km" | "mi";
  disabled?: boolean;
  /** history/detail display mode (docs/plans/phase-1-mvp.md Task 10) */
  readOnly?: boolean;
  /** detail edit mode: patch/remove receivers for the caller's draft */
  onSetPatch?: (setId: string, patch: Partial<WorkoutSet>) => void;
  onRemoveSet?: (setId: string) => void;
}) {
  const { t } = useTranslation();
  const workouts = useWorkouts(200);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(false);
  const previous = readOnly ? null : previousPerformance(workouts.data ?? [], entry.exerciseId);

  if (!exercise) return null;

  const addSet = async () => {
    const previousSet = entry.sets.at(-1);
    await useActiveWorkoutStore.getState().addSet(entry.id);
    if (previousSet?.done) useRestTimerStore.getState().start();
  };

  const repeat = async (weightKg: number, reps: number, rpe: number | null) => {
    // prefill every not-yet-filled normal set of this entry (sequential PATCH)
    for (let guard = 0; guard < 50; guard++) {
      const mirror = useActiveWorkoutStore.getState().workout;
      const target = mirror?.entries
        .find((candidate) => candidate.id === entry.id)
        ?.sets.find((set) => set.type === "normal" && set.weightKg === null && set.reps === null);
      if (!target) break;
      await useActiveWorkoutStore.getState().updateSet(entry.id, target.id, {
        weightKg,
        reps,
        ...(rpe !== null ? { rpe } : {}),
      });
    }
  };

  const replaceExercise = async (newExerciseId: string) => {
    const store = useActiveWorkoutStore.getState();
    const length = store.workout?.entries.length ?? 0;
    const index = store.workout?.entries.findIndex((candidate) => candidate.id === entry.id) ?? -1;
    await store.addExercise(newExerciseId);
    // the appended entry lands last — walk it up to the replaced position
    for (let step = 0; step < length - 1 - index; step++) {
      const appendedId = useActiveWorkoutStore.getState().workout?.entries.at(-1)?.id;
      if (appendedId) await useActiveWorkoutStore.getState().moveEntry(appendedId, -1);
    }
    await useActiveWorkoutStore.getState().removeEntry(entry.id);
  };

  return (
    <div className="rounded-radius border border-border bg-surface">
      <header className="flex items-center gap-2 px-4 py-2.5">
        {readOnly ? (
          <span className="truncate text-base font-medium">{exercise.name}</span>
        ) : (
          <button
            type="button"
            className="min-h-11 flex-1 truncate text-left text-base font-medium"
            onClick={() => setPreviousOpen(true)}
          >
            {exercise.name}
          </button>
        )}
        {entry.supersetId ? (
          <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
            {t("workout.superset")}
          </span>
        ) : null}
        {!readOnly && !onSetPatch ? (
          <button
            type="button"
            aria-label={t("workout.entryMenu")}
            className="min-h-11 min-w-9 text-text-muted"
            onClick={() => setMenuOpen(true)}
          >
            ⋯
          </button>
        ) : null}
      </header>

      <ul className="divide-y divide-border">
        {entry.sets.map((set) => (
          <li key={set.id}>
            <SetRow
              entryId={entry.id}
              set={set}
              exerciseType={exercise.type}
              weightUnit={weightUnit}
              distanceUnit={distanceUnit}
              disabled={disabled}
              readOnly={readOnly && !onSetPatch}
              onPatch={onSetPatch ? (patch) => onSetPatch(set.id, patch) : undefined}
              onRemove={onRemoveSet && onSetPatch ? () => onRemoveSet(set.id) : undefined}
            />
          </li>
        ))}
      </ul>

      {readOnly ? (
        entry.notes !== "" ? (
          <p className="px-4 pb-3 text-sm text-text-muted">{entry.notes}</p>
        ) : null
      ) : notesOpen ? (
        <div className="px-4 py-2">
          <Input
            aria-label={t("workout.notes")}
            defaultValue={entry.notes}
            placeholder={t("workout.notes")}
            onChange={() => undefined}
            onBlur={(event) => {
              void useActiveWorkoutStore.getState().setEntryNotes(entry.id, event.target.value);
              if (event.target.value === "") setNotesOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>
      ) : null}

      {!readOnly ? (
        <div className="flex gap-2 px-4 py-3">
          {entry.notes === "" && !notesOpen ? (
            <button
              type="button"
              className="min-h-11 rounded-sm px-3 text-sm text-text-muted disabled:opacity-50"
              disabled={disabled}
              onClick={() => setNotesOpen(true)}
            >
              {t("workout.addNote")}
            </button>
          ) : null}
          <button
            type="button"
            className="min-h-11 flex-1 rounded-sm border border-dashed border-border text-sm text-text-muted disabled:opacity-50"
            disabled={disabled}
            onClick={() => void addSet()}
          >
            {t("workout.addSet")}
          </button>
        </div>
      ) : null}

      <PreviousSheet
        open={previousOpen}
        onOpenChange={setPreviousOpen}
        exercise={exercise}
        previous={previous}
        weightUnit={weightUnit}
        onRepeat={(weightKg, reps, rpe) => void repeat(weightKg, reps, rpe)}
      />

      <EntryMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        entry={entry}
        entries={entries}
        onReplace={() => {
          setMenuOpen(false);
          setPickerOpen(true);
        }}
      />
      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(newExerciseId) => void replaceExercise(newExerciseId)}
      />
    </div>
  );
}

/** Header sheet — previous performance + "repeat" prefill (Task 9). */
function PreviousSheet({
  open,
  onOpenChange,
  exercise,
  previous,
  weightUnit,
  onRepeat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise;
  previous: { weightKg: number; reps: number; rpe: number | null } | null;
  weightUnit: "kg" | "lbs";
  onRepeat: (weightKg: number, reps: number, rpe: number | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={exercise.name}>
      {previous ? (
        <div className="flex flex-col gap-3 pb-3">
          <p className="numeric text-lg">
            {t("workout.previous")}: {displayWeight(previous.weightKg, weightUnit)} ×{" "}
            {previous.reps}
            {previous.rpe !== null ? ` @ ${previous.rpe} RPE` : ""}
          </p>
          <Button
            onClick={() => {
              onRepeat(previous.weightKg, previous.reps, previous.rpe);
              onOpenChange(false);
            }}
          >
            {t("workout.repeat")}
          </Button>
        </div>
      ) : (
        <p className="pb-3 text-sm text-text-muted">{t("workout.noPrevious")}</p>
      )}
    </Sheet>
  );
}

/** ⋯ sheet — superset toggle, replace, move, delete (with confirm). */
function EntryMenuSheet({
  open,
  onOpenChange,
  entry,
  entries,
  onReplace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: WorkoutEntry;
  entries: WorkoutEntry[];
  onReplace: () => void;
}) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const store = useActiveWorkoutStore.getState();
  const siblings = entries.filter((candidate) => candidate.id !== entry.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("workout.entryMenu")}>
      <ul className="divide-y divide-border">
        {siblings.map((sibling) => (
          <li key={sibling.id}>
            <button
              type="button"
              className="min-h-11 w-full px-2 py-3 text-left text-sm"
              onClick={() => {
                void store.toggleSuperset(entry.id, sibling.id);
                onOpenChange(false);
              }}
            >
              {siblings.length > 1
                ? entry.supersetId !== null && entry.supersetId === sibling.supersetId
                  ? t("workout.unsuperset")
                  : t("workout.supersetWith")
                : t("workout.supersetWith")}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className="min-h-11 w-full px-2 py-3 text-left text-sm"
            onClick={onReplace}
          >
            {t("workout.replaceExercise")}
          </button>
        </li>
        <li>
          <button
            type="button"
            className="min-h-11 w-full px-2 py-3 text-left text-sm"
            onClick={() => {
              void store.moveEntry(entry.id, -1);
              onOpenChange(false);
            }}
          >
            {t("workout.moveUp")}
          </button>
        </li>
        <li>
          <button
            type="button"
            className="min-h-11 w-full px-2 py-3 text-left text-sm"
            onClick={() => {
              void store.moveEntry(entry.id, 1);
              onOpenChange(false);
            }}
          >
            {t("workout.moveDown")}
          </button>
        </li>
      </ul>
      {confirmDelete ? (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              void store.removeEntry(entry.id);
              onOpenChange(false);
            }}
          >
            {t("common.delete")}
          </Button>
        </div>
      ) : (
        <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirmDelete(true)}>
          {t("workout.deleteEntry")}
        </Button>
      )}
    </Sheet>
  );
}
