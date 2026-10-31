import type { ExerciseType, WorkoutSet } from "@reph/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveWorkoutStore } from "../../stores/activeWorkout";
import { displayWeight, lbToKg } from "../../lib/units";
import { Input } from "../ui/Input";
import { Sheet } from "../ui/Sheet";
import { NumberStepper } from "../ui/NumberStepper";
import { Button } from "../ui/Button";

// One set line — three modes (Task 9/10):
//   live  — commits to the active-workout store (✓, menus, RPE popover)
//   edit  — workout-detail inline edit; patches go to the caller's draft
//   readOnly — history display through displayWeight
// Weights display in the user's unit but always commit canonical kg.

type WeightUnit = "kg" | "lbs";
type DistanceUnit = "km" | "mi";

export function SetRow({
  entryId,
  set,
  exerciseType,
  weightUnit,
  distanceUnit,
  disabled = false,
  readOnly = false,
  onPatch,
  onRemove,
}: {
  entryId: string;
  set: WorkoutSet;
  exerciseType: ExerciseType;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  disabled?: boolean;
  readOnly?: boolean;
  /** edit mode: patch receiver (idle while live mode writes to the store) */
  onPatch?: (patch: Partial<WorkoutSet>) => void;
  /** edit mode: removes the set from the caller's draft */
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rpeOpen, setRpeOpen] = useState(false);

  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <span
          className={`numeric text-sm ${set.done ? "text-text" : "text-text-muted line-through"}`}
        >
          {set.done ? "✓" : "○"}
        </span>
        {exerciseType === "strength" ? (
          <span className="numeric text-sm">
            {displayWeight(set.weightKg, weightUnit)} × {set.reps ?? "–"}
          </span>
        ) : (
          <span className="numeric text-sm">
            {cardioSummary(set, distanceUnit, t("common.minutesShort"))}
          </span>
        )}
        {exerciseType === "strength" && set.rpe !== null ? (
          <span className="numeric text-xs text-text-muted">@ {set.rpe} RPE</span>
        ) : null}
        {set.type !== "normal" ? (
          <span className="rounded-sm px-1.5 py-0.5 text-xs bg-surface-2 text-text-muted">
            {t(`workout.setType.${set.type}`)}
          </span>
        ) : null}
      </div>
    );
  }

  const patch = (partial: Partial<WorkoutSet>) => {
    if (onPatch) {
      onPatch(partial);
      return;
    }
    void useActiveWorkoutStore.getState().updateSet(entryId, set.id, partial);
  };

  const toggleDone = () => patch({ done: !set.done });

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
        <StrengthFields set={set} weightUnit={weightUnit} disabled={disabled} onPatch={patch} />
      ) : (
        <CardioFields set={set} distanceUnit={distanceUnit} disabled={disabled} onPatch={patch} />
      )}

      {exerciseType === "strength" && onPatch ? (
        <NumberCell
          label={t("workout.rpe")}
          value={set.rpe}
          disabled={disabled}
          className="w-14"
          onCommit={(rpe) => patch({ rpe })}
        />
      ) : null}
      {exerciseType === "strength" && !onPatch ? (
        <button
          type="button"
          onClick={() => setRpeOpen(true)}
          className="numeric min-h-9 rounded-sm border border-border bg-surface-2 px-2 text-xs disabled:opacity-50"
          disabled={disabled}
        >
          RPE {set.rpe ?? "–"}
        </button>
      ) : null}

      {onRemove ? (
        <button
          type="button"
          aria-label={t("workout.deleteSet")}
          onClick={onRemove}
          className="min-h-9 min-w-9 rounded-sm text-danger"
        >
          ×
        </button>
      ) : null}

      {!onPatch ? (
        <button
          type="button"
          aria-label={t("workout.setMenu")}
          disabled={disabled}
          onClick={() => setMenuOpen(true)}
          className="min-h-9 min-w-9 rounded-sm text-text-muted"
        >
          ⋯
        </button>
      ) : null}

      {set.type !== "normal" ? (
        <span className="rounded-sm px-1.5 py-0.5 text-xs bg-surface-2 text-text-muted">
          {t(`workout.setType.${set.type}`)}
        </span>
      ) : null}

      {!onPatch ? (
        <>
          <SetMenuSheet open={menuOpen} onOpenChange={setMenuOpen} entryId={entryId} set={set} />
          <RpeSheet open={rpeOpen} onOpenChange={setRpeOpen} entryId={entryId} set={set} />
        </>
      ) : null}
    </div>
  );
}

function cardioSummary(set: WorkoutSet, unit: DistanceUnit, minutesLabel: string): string {
  const parts: string[] = [];
  if (set.durationSeconds !== null)
    parts.push(`${Math.round(set.durationSeconds / 60)} ${minutesLabel}`);
  if (set.distanceMeters !== null) {
    parts.push(
      `${Math.round((set.distanceMeters / (unit === "mi" ? 1609.344 : 1000)) * 100) / 100} ${unit}`,
    );
  }
  if (set.calories !== null) parts.push(`${set.calories} kcal`);
  return parts.join(" · ") || "–";
}

/** Numeric tap-to-edit cell; commits on blur/Enter, shows "–"/empty when null. */
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
      className={`h-9 px-1 text-center ${className}`}
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
  set,
  weightUnit,
  disabled,
  onPatch,
}: {
  set: WorkoutSet;
  weightUnit: WeightUnit;
  disabled?: boolean;
  onPatch: (patch: Partial<WorkoutSet>) => void;
}) {
  const { t } = useTranslation();
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
        className="numeric w-16"
        onCommit={(value) => {
          const kg = value === null ? null : weightUnit === "lbs" ? lbToKg(value) : value;
          onPatch({ weightKg: kg });
        }}
      />
      <span aria-hidden="true" className="text-text-muted">
        ×
      </span>
      <NumberCell
        label={t("workout.reps")}
        value={set.reps}
        disabled={disabled}
        className="w-16"
        onCommit={(reps) => onPatch({ reps })}
      />
    </>
  );
}

/** kg → lb for display inside the weight field. */
function kgToLbWeight(kg: number): number {
  return kg * 2.20462;
}

function CardioFields({
  set,
  distanceUnit,
  disabled,
  onPatch,
}: {
  set: WorkoutSet;
  distanceUnit: DistanceUnit;
  disabled?: boolean;
  onPatch: (patch: Partial<WorkoutSet>) => void;
}) {
  const { t } = useTranslation();
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
        className="w-16"
        onCommit={(value) =>
          onPatch({ durationSeconds: value === null ? null : Math.round(value * 60) })
        }
      />
      <NumberCell
        label={`${t("workout.distance")} (${distanceUnit})`}
        value={distance}
        disabled={disabled}
        className="w-16"
        onCommit={(value) =>
          onPatch({
            distanceMeters:
              value === null ? null : Math.round(value * (distanceUnit === "mi" ? 1609.344 : 1000)),
          })
        }
      />
      <NumberCell
        label={t("workout.calories")}
        value={set.calories}
        disabled={disabled}
        className="w-16"
        onCommit={(calories) => onPatch({ calories })}
      />
    </>
  );
}

/** ⋯ sheet (live mode) — set-type cycle + delete. */
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

/** RPE 0–10 in half-point steps (live mode). */
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
