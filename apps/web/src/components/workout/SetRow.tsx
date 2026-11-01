import type { ExerciseType, WorkoutSet } from "@reph/contracts";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveWorkoutStore } from "../../stores/activeWorkout";
import { useRestTimerStore } from "../../stores/restTimer";
import { displayWeight, lbToKg } from "../../lib/units";
import { Input } from "../ui/Input";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";

// One set line rendered as a compact table row (Hevy-style):
//   SET | PREVIOUS | <unit> | REPS | RPE | ✓
// Green row + green check when done. Three modes:
//   live    — commits to the active-workout store
//   edit    — workout-detail inline edit (patches go to the caller's draft)
//   readOnly— history display through displayWeight
// Weights display in the user's unit but always commit canonical kg.

type WeightUnit = "kg" | "lbs";
type DistanceUnit = "km" | "mi";

type Previous = { weightKg: number; reps: number; rpe: number | null } | null;

export function SetRow({
  entryId,
  set,
  exerciseType,
  weightUnit,
  distanceUnit,
  previous,
  setIndex,
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
  /** last performance of this exercise (EntryCard computes it once) */
  previous?: Previous;
  /** display index within the entry (1-based) */
  setIndex?: number;
  disabled?: boolean;
  readOnly?: boolean;
  onPatch?: (patch: Partial<WorkoutSet>) => void;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const patch = (partial: Partial<WorkoutSet>) => {
    if (onPatch) {
      onPatch(partial);
      return;
    }
    void useActiveWorkoutStore.getState().updateSet(entryId, set.id, partial);
  };

  const done = set.done;
  const index = setIndex ?? 1;
  const previousLabel =
    previous === null || previous === undefined
      ? "–"
      : `${previous.weightKg === null ? "–" : displayWeight(previous.weightKg, weightUnit)} × ${previous.reps ?? "–"}`;

  // ---- readOnly: display-only compact row (matches the live table columns) ----
  if (readOnly) {
    return (
      <div
        className={`grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2 px-4 py-2 text-sm ${
          done ? "bg-success/10" : ""
        }`}
      >
        <span className="numeric text-text-muted">{index}</span>
        {exerciseType === "strength" ? (
          <>
            <span className="numeric text-text-muted">{previousLabel}</span>
            <span className="numeric">
              {displayWeight(set.weightKg, weightUnit)} × {set.reps ?? "–"}
            </span>
            <span className="numeric text-center">{done ? "✓" : "○"}</span>
          </>
        ) : (
          <>
            <span className="numeric text-text-muted">{previousLabel}</span>
            <span className="numeric col-span-3">
              {cardioSummary(set, distanceUnit, t("common.minutesShort"))}
            </span>
          </>
        )}
      </div>
    );
  }

  // ---- live / edit: interactive table row ----
  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr_1fr_auto_auto] items-center gap-2 px-4 py-2 ${
        done ? "bg-success/10" : ""
      } ${set.type !== "normal" ? "border-l-2 border-accent" : ""}`}
    >
      <span className="numeric text-sm text-text-muted">{index}</span>

      <span className="numeric truncate text-sm text-text-muted" title={previousLabel}>
        {previousLabel}
      </span>

      {exerciseType === "strength" ? (
        <>
          <NumberCell
            label={`${t("workout.weight")} (${weightUnit})`}
            value={
              set.weightKg === null
                ? null
                : Math.round(
                    (weightUnit === "lbs" ? kgToLbWeight(set.weightKg) : set.weightKg) * 100,
                  ) / 100
            }
            disabled={disabled}
            className="numeric"
            onCommit={(value) => {
              const kg = value === null ? null : weightUnit === "lbs" ? lbToKg(value) : value;
              patch({ weightKg: kg });
            }}
          />
          <NumberCell
            label={t("workout.reps")}
            value={set.reps}
            disabled={disabled}
            className="numeric"
            onCommit={(reps) => patch({ reps })}
          />
        </>
      ) : (
        <>
          <NumberCell
            label={`${t("workout.duration")} (${t("common.minutesShort")})`}
            value={
              set.durationSeconds === null ? null : Math.round((set.durationSeconds / 60) * 10) / 10
            }
            disabled={disabled}
            className="numeric"
            onCommit={(value) =>
              patch({ durationSeconds: value === null ? null : Math.round(value * 60) })
            }
          />
          <NumberCell
            label={`${t("workout.distance")} (${distanceUnit})`}
            value={
              set.distanceMeters === null
                ? null
                : Math.round(
                    (set.distanceMeters / (distanceUnit === "mi" ? 1609.344 : 1000)) * 100,
                  ) / 100
            }
            disabled={disabled}
            className="numeric"
            onCommit={(value) =>
              patch({
                distanceMeters:
                  value === null
                    ? null
                    : Math.round(value * (distanceUnit === "mi" ? 1609.344 : 1000)),
              })
            }
          />
          <span className="numeric text-sm text-text-muted">
            {set.calories !== null ? `${set.calories} kcal` : "–"}
          </span>
        </>
      )}

      {onRemove ? (
        <button
          type="button"
          aria-label={t("workout.deleteSet")}
          onClick={onRemove}
          className="min-h-9 min-w-7 rounded-sm text-danger"
        >
          ×
        </button>
      ) : null}

      {!onPatch ? (
        <button
          type="button"
          aria-label={t("workout.markDone")}
          aria-pressed={done}
          disabled={disabled}
          onClick={() => {
            const next = !done;
            patch({ done: next });
            if (next) useRestTimerStore.getState().start();
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
            done
              ? "border-success bg-success text-accent-contrast"
              : "border-border bg-surface-2 text-text-muted"
          }`}
        >
          ✓
        </button>
      ) : null}

      {!onPatch ? (
        <>
          <SetMenuSheet open={menuOpen} onOpenChange={setMenuOpen} entryId={entryId} set={set} />
        </>
      ) : null}
    </div>
  );
}

/** Table header above the set rows: SET · PREVIOUS · <unit> · REPS · ✓. */
export function ColumnHeader({
  exerciseType,
  weightUnit,
  distanceUnit,
}: {
  exerciseType: ExerciseType;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
}) {
  const { t } = useTranslation();
  const unitLabel =
    exerciseType === "strength"
      ? weightUnit.toUpperCase()
      : `${t("common.minutesShort")}/${distanceUnit}`;
  return (
    <div
      className="grid grid-cols-[2.5rem_1fr_1fr_auto_auto] items-center gap-2 border-b border-border bg-surface-2/50 px-4 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-text-muted"
      aria-hidden="true"
    >
      <span>SET</span>
      <span>{t("workout.previousShort")}</span>
      <span>{unitLabel}</span>
      <span>{t("workout.repsShort")}</span>
      <span className="w-8 text-center">✓</span>
    </div>
  );
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
      className={`h-9 min-w-0 px-1 text-center ${className}`}
      value={shownValue}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

/** kg → lb for display inside the weight field. */
function kgToLbWeight(kg: number): number {
  return kg * 2.20462;
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
