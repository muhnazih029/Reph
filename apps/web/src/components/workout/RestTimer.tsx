import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRestTimerStore } from "../../stores/restTimer";
import { Icon } from "../ui/Icon";

// Rest timer — a toast, never a banner in the flow: a banner would push
// the set table down exactly when the user is mid-set. The toast floats
// above the tab bar, counts down, and disappears when the rest is over
// (the store beeps and vibrates at the same moment). The active-workout
// header carries a small marker so the remaining time is visible even
// when the toast is dismissed.

function format(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Remaining rest time in mm:ss (0 when idle). */
export function useRestCountdown(): string {
  const remaining = useRestTimerStore((state) => state.remainingSeconds);
  const running = useRestTimerStore((state) => state.isRunning);
  return running || remaining > 0 ? format(remaining) : "";
}

/** Small accent marker for the workout header — "Rest 0:42". */
export function RestTimerBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const countdown = useRestCountdown();
  if (!countdown) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2 py-1 text-xs font-medium text-accent ${className}`}
    >
      <Icon name="timer" size={13} />
      {t("restTimer.remaining", { time: countdown })}
    </span>
  );
}

/** The floating toast: countdown, pause, +15 s, skip. */
export function RestTimerToast() {
  const { t } = useTranslation();
  const remaining = useRestTimerStore((state) => state.remainingSeconds);
  const running = useRestTimerStore((state) => state.isRunning);
  const finishedAt = useRestTimerStore((state) => state.finishedAt);
  const { pause, resume, cancel, addSeconds } = useRestTimerStore.getState();
  const [celebrating, setCelebrating] = useState(false);

  // "Rest selesai" flickers for a moment, then the toast is gone.
  useEffect(() => {
    if (finishedAt === null) {
      setCelebrating(false);
      return;
    }
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 2500);
    return () => clearTimeout(timer);
  }, [finishedAt]);

  const active = running || remaining > 0 || celebrating;
  if (!active) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] md:inset-x-auto md:bottom-6 md:right-6"
      role="timer"
      aria-label={t("restTimer.label")}
    >
      <div className="flex min-h-11 items-center gap-2 rounded-radius bg-accent/15 px-3 py-2 text-accent shadow-lg backdrop-blur-md">
        <Icon name="timer" size={16} />
        <span className="numeric text-sm font-medium">
          {celebrating && !running && remaining === 0
            ? t("restTimer.done")
            : t("restTimer.remaining", { time: format(remaining) })}
        </span>
        {!celebrating || running ? (
          <div className="ml-1 flex items-center gap-1">
            <button
              type="button"
              aria-label={running ? t("restTimer.pause") : t("restTimer.resume")}
              onClick={() => (running ? pause() : resume())}
              className="min-h-9 rounded-sm px-2 text-sm text-accent/80"
            >
              {running ? t("restTimer.pause") : t("restTimer.resume")}
            </button>
            <button
              type="button"
              className="min-h-9 rounded-sm px-2 text-sm text-accent/80"
              onClick={() => addSeconds(15)}
            >
              +15 {t("common.secondsShort")}
            </button>
            <button
              type="button"
              aria-label={t("restTimer.cancel")}
              onClick={cancel}
              className="min-h-9 rounded-sm px-2 text-sm text-accent/80"
            >
              {t("restTimer.skip")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
