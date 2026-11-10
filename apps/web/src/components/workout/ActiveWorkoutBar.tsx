import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Icon } from "../ui/Icon";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useActiveWorkoutStore } from "../../stores/activeWorkout";
import { useActiveWorkoutSummary } from "../../lib/useHasActiveWorkout";
import { useElapsedTick } from "../../lib/useElapsedTick";

// Mini bar for a running workout — the "now playing" strip. While a
// workout is running the user may leave the screen (the session keeps
// running); this bar floats above the tab bar and brings them back in
// one tap, with the clock still ticking. The ✕ discards the workout
// behind a confirmation dialog.
//
// It hides on the active-workout screen itself, where the full header
// already shows title, clock and Finish.

export function ActiveWorkoutBar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const workout = useActiveWorkoutSummary();
  const [discardOpen, setDiscardOpen] = useState(false);
  // The hook runs before the early return — the clock keeps ticking even
  // while the bar is hidden.
  const elapsed = useElapsedTick(workout?.startTime ?? Date.now());

  if (!workout || pathname === "/workout/active") return null;

  const title = workout.title === "" ? t("workout.titlePlaceholder") : workout.title;

  return (
    <>
      <div className="fixed inset-x-3 bottom-24 z-40 md:inset-x-auto md:bottom-6 md:left-6 md:w-80">
        <div className="flex min-h-14 items-center gap-3 rounded-radius border border-border bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-md">
          <Link
            to="/workout/active"
            className="flex min-w-0 flex-1 items-center gap-3"
            aria-label={t("workout.resume")}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Icon name="dumbbell" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text">{title}</span>
              <span className="numeric block text-xs text-text-muted">
                {t("workout.inProgress")} · {elapsed}
              </span>
            </span>
          </Link>
          <Link
            to="/workout/active"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast"
            aria-label={t("workout.resume")}
          >
            <Icon name="chevron-right" size={16} />
          </Link>
          <button
            type="button"
            aria-label={t("workout.discard")}
            onClick={() => setDiscardOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-muted"
          >
            <Icon name="trash-2" size={16} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={t("workout.discard")}
        description={t("workout.discardConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("workout.discard")}
        onConfirm={() => {
          void useActiveWorkoutStore
            .getState()
            .discardWorkout()
            .then(() => setDiscardOpen(false));
        }}
      />
    </>
  );
}
