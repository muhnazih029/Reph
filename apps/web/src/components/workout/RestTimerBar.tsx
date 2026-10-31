import { useTranslation } from "react-i18next";
import { useRestTimerStore } from "../../stores/restTimer";

// Compact bar above the TabBar while a rest is running (Task 9) —
// remaining mm:ss, pause/resume, +15 s, cancel.

function format(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function RestTimerBar() {
  const { t } = useTranslation();
  const remaining = useRestTimerStore((state) => state.remainingSeconds);
  const running = useRestTimerStore((state) => state.isRunning);
  const { pause, resume, cancel, addSeconds } = useRestTimerStore.getState();

  if (!running && remaining === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-14 z-40 mx-auto flex max-w-2xl items-center gap-2 rounded-radius border border-border bg-surface px-4 py-2 shadow-lg"
      role="timer"
      aria-label={t("restTimer.label")}
    >
      <span className="numeric text-lg font-medium">{format(remaining)}</span>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label={running ? t("restTimer.pause") : t("restTimer.resume")}
          onClick={() => (running ? pause() : resume())}
          className="min-h-11 rounded-sm px-3 text-sm"
        >
          {running ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-sm px-2 text-sm"
          onClick={() => addSeconds(15)}
        >
          +15 {t("common.secondsShort")}
        </button>
        <button
          type="button"
          aria-label={t("restTimer.cancel")}
          onClick={cancel}
          className="min-h-11 rounded-sm px-3 text-sm text-text-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
