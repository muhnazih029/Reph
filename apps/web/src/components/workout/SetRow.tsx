import type { ExerciseType, WorkoutSet } from "@reph/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveWorkoutStore } from "../../stores/activeWorkout";
import { lbToKg } from "../../lib/units";
import { Input } from "../ui/Input";
import { Sheet } from "../ui/Sheet";
import { NumberStepper } from "../ui/NumberStepper";
import { Button } from "../ui/Button";

// One set line: [✓] [weight] × [reps] [RPE] [badge] [⋯] (strength) or
// [✓] [duration] [distance] [calories] (cardio) — Task 9. Tap-to-edit
// inputs commit on blur/Enter; weights display in the user's unit but
// commit as canonical kg.

type WeightUnit = "kg" | "lbs";
type DistanceUnit = "km" | "mi";

export function SetRow({
  entryId,
  set,
  exerciseType,
  weightUnit,
  distanceUnit,
  disabled = false,
}: {
  entryId: string;
  set: WorkoutSet;
  exerciseType: ExerciseType;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rpeOpen, setRpeOpen] = useState(false);

  const toggleDone = () => {
    void useActiveWorkoutStore.getState().updateSet(entryId, set.id, { done: !set.done });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 px-4 py-2 ${set.done ? "opacity-60" : ""}`}>
      <button
        type="button"
        aria-label={t("workout.markDone")}
        aria-pressed={set.done}
        disabled={disabled}
        onClick={toggleDone}
        className={`flex h-9 w-9 items-center justify-center rounded-sm border ${
          set.done
            ? "border-accent bg-accent text-accent-contrast"
            : "border-border bg-surface-2 text-text-muted"
        }`}
      >
        ✓
      </button>

      {exerciseType === "strength" ? (
        <StrengthFields entryId={entryId} set={set} weightUnit={weightUnit} disabled={disabled} />
      ) : (
        <CardioFields entryId={entryId} set={set} distanceUnit={distanceUnit} disabled={disabled} />
      )}

      {exerciseType === "strength" ? (
        <button
          type="button"
          onClick={() => setRpeOpen(true)}
          className="numeric min-h-9 rounded-sm border border-border bg-surface-2 px-2 text-xs disabled:opacity-50"
          disabled={disabled}
        >
          RPE {set.rpe ?? "–"}
        </button>
      ) : null}

      <button
        type="button"
        aria-label={t("workout.setMenu")}
        disabled={disabled}
        onClick={() => setMenuOpen(true)}
        className="min-h-9 min-w-9 rounded-sm text-text-muted"
      >
        ⋯
      </button>

      <span
        className={`rounded-sm px-1.5 py-0.5 text-xs ${set.type === "normal" ? "invisible" : "bg-surface-2 text-text-muted"}`}
      >
        {t(`workout.setType.${set.type}`)}
      </span>

      <SetMenuSheet open={menuOpen} onOpenChange={setMenuOpen} entryId={entryId} set={set} />
      <RpeSheet open={rpeOpen} onOpenChange={setRpeOpen} entryId={entryId} set={set} />
    </div>
  );
}

/** Numeric tap-to-edit cell; commits on blur/Enter, shows "–" when empty. */
function NumberCell({
  value,
  onCommit,
  label,
  disabled,
  className = "",
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const shownValue = draft ?? (value === null ? "" : String(value));
  const commit = () => {
    if (draft === null) return;
    const parsed = draft.trim() === "" ? null : Number(draft.replace(",", "."));
    onCommit(Number.isFinite(parsed as number) ? (parsed as number) : null);
    setDraft(null);
  };

  return (
    <Input
      aria-label={label}
      numeric
      disabled={disabled}
      className={`h-9 w-16 px-1 text-center ${className}`}
      value={shownValue}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function StrengthFields({
  entryId,
  set,
  weightUnit,
  disabled,
}: {
  entryId: string;
  set: WorkoutSet;
  weightUnit: WeightUnit;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const store = useActiveWorkoutStore.getState();
  const display =
    set.weightKg === null
      ? null
      : Math.round((weightUnit === "lbs" ? kgToLbWeight(set.weightKg) : set.weightKg) * 100) / 100;

  return (
    <>
      <NumberCell
        label={`${t("workout.weight")} (${weightUnit})`}
        value={display}
        disabled={disabled}
        className="numeric"
        onCommit={(value) => {
          const kg = value === null ? null : weightUnit === "lbs" ? lbToKg(value) : value;
          void store.updateSet(entryId, set.id, { weightKg: kg });
        }}
      />
      <span aria-hidden="true" className="text-text-muted">
        ×
      </span>
      <NumberCell
        label={t("workout.reps")}
        value={set.reps}
        disabled={disabled}
        onCommit={(reps) => void store.updateSet(entryId, set.id, { reps })}
      />
    </>
  );
}

/** kg → lb for display inside the weight field. */
function kgToLbWeight(kg: number): number {
  return kg * 2.20462;
}

function CardioFields({
  entryId,
  set,
  distanceUnit,
  disabled,
}: {
  entryId: string;
  set: WorkoutSet;
  distanceUnit: DistanceUnit;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const store = useActiveWorkoutStore.getState();
  const minutes =
    set.durationSeconds === null ? null : Math.round((set.durationSeconds / 60) * 10) / 10;
  const distance =
    set.distanceMeters === null
      ? null
      : Math.round((set.distanceMeters / (distanceUnit === "mi" ? 1609.344 : 1000)) * 100) / 100;

  return (
    <>
      <NumberCell
        label={`${t("workout.duration")} (${t("common.minutesShort")})`}
        value={minutes}
        disabled={disabled}
        onCommit={(value) =>
          void store.updateSet(entryId, set.id, {
            durationSeconds: value === null ? null : Math.round(value * 60),
          })
        }
      />
      <NumberCell
        label={`${t("workout.distance")} (${distanceUnit})`}
        value={distance}
        disabled={disabled}
        onCommit={(value) =>
          void store.updateSet(entryId, set.id, {
            distanceMeters:
              value === null ? null : Math.round(value * (distanceUnit === "mi" ? 1609.344 : 1000)),
          })
        }
      />
      <NumberCell
        label={t("workout.calories")}
        value={set.calories}
        disabled={disabled}
        onCommit={(value) => void store.updateSet(entryId, set.id, { calories: value })}
      />
    </>
  );
}

/** ⋯ sheet — set-type cycle + delete (docs/plans/phase-1-mvp.md Task 9). */
function SetMenuSheet({
  open,
  onOpenChange,
  entryId,
  set,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
  set: WorkoutSet;
}) {
  const { t } = useTranslation();
  const store = useActiveWorkoutStore.getState();

  const cycleType = (next: WorkoutSet["type"]) => {
    void store.updateSet(entryId, set.id, { type: next });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ul className="divide-y divide-border">
        {(["normal", "warmup", "drop", "failure"] as const).map((type) => (
          <li key={type}>
            <button
              type="button"
              onClick={() => cycleType(type)}
              className="flex min-h-11 w-full items-center px-2 py-3 text-sm"
            >
              {t(`workout.setType.${type}`)}
              {set.type === type ? <span className="ml-2 text-accent">✓</span> : null}
            </button>
          </li>
        ))}
        <li>
          <Button
            variant="danger"
            className="mt-3 w-full"
            onClick={() => {
              void store.removeSet(entryId, set.id);
              onOpenChange(false);
            }}
          >
            {t("workout.deleteSet")}
          </Button>
        </li>
      </ul>
    </Sheet>
  );
}

/** RPE 0–10 in half-point steps (docs/plans/phase-1-mvp.md Task 9). */
function RpeSheet({
  open,
  onOpenChange,
  entryId,
  set,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
  set: WorkoutSet;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("workout.rpe")}>
      <div className="flex flex-col items-center gap-3 pb-4">
        <NumberStepper
          label={t("workout.rpe")}
          value={(set.rpe ?? 0) * 2}
          step={1}
          min={0}
          max={20}
          onChange={(value) => {
            void useActiveWorkoutStore.getState().updateSet(entryId, set.id, { rpe: value / 2 });
          }}
        />
        <Button className="w-full" onClick={() => onOpenChange(false)}>
          {t("common.confirm")}
        </Button>
      </div>
    </Sheet>
  );
}
