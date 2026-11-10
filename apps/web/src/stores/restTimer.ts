import { create } from "zustand";
import { queryClient } from "../api/queryClient";

// Rest timer — decrements once per second until zero, then beeps (WebAudio
// oscillator) and vibrates when the platform supports it (docs/plans/
// phase-1-mvp.md, Core Interfaces → Rest timer). The default duration
// comes from the settings cache; callers may always pass a total.

export interface RestTimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  /** When the last rest ran out — the toast says "Rest selesai" for a
   *  moment, then disappears (nothing shifts the layout). */
  finishedAt: number | null;
  start(totalSeconds?: number): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  addSeconds(n: number): void;
}

let interval: ReturnType<typeof setInterval> | null = null;

/** Best-effort feedback — never throws (test/embedded environments lack WebAudio). */
function beepAndBuzz(): void {
  try {
    const AudioContextCtor = (globalThis as unknown as { AudioContext?: new () => AudioContext })
      .AudioContext;
    if (AudioContextCtor) {
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      oscillator.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3); // 300 ms beep
    }
    const vibrate = (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean })
      .vibrate;
    // three pulses — easy to notice in a loud gym, still short
    vibrate?.call(navigator, [250, 120, 250, 120, 400]);
  } catch {
    // audio/vibration are optional platform capabilities
  }
}

function stopTicking() {
  if (interval) clearInterval(interval);
  interval = null;
}

export const useRestTimerStore = create<RestTimerState>()((set, get) => ({
  totalSeconds: 90,
  remainingSeconds: 0,
  isRunning: false,
  finishedAt: null,

  start: (totalSeconds) => {
    // settings cache drives the default (docs/plans/phase-1-mvp.md Task 9)
    const settings = queryClient.getQueryData(["settings"]) as
      | { restTimerSeconds?: number }
      | undefined;
    const total = totalSeconds ?? settings?.restTimerSeconds ?? 90;

    stopTicking();
    set({ totalSeconds: total, remainingSeconds: total, isRunning: true, finishedAt: null });

    interval = setInterval(() => {
      const remaining = get().remainingSeconds - 1;
      if (remaining <= 0) {
        stopTicking();
        set({ remainingSeconds: 0, isRunning: false, finishedAt: Date.now() });
        beepAndBuzz();
        return;
      }
      set({ remainingSeconds: remaining });
    }, 1000);
  },

  pause: () => {
    if (!get().isRunning) return;
    stopTicking();
    set({ isRunning: false });
  },

  resume: () => {
    if (get().isRunning || get().remainingSeconds <= 0) return;
    stopTicking();
    set({ isRunning: true });
    interval = setInterval(() => {
      const remaining = get().remainingSeconds - 1;
      if (remaining <= 0) {
        stopTicking();
        set({ remainingSeconds: 0, isRunning: false, finishedAt: Date.now() });
        beepAndBuzz();
        return;
      }
      set({ remainingSeconds: remaining });
    }, 1000);
  },

  cancel: () => {
    stopTicking();
    set({ isRunning: false, remainingSeconds: 0, finishedAt: null });
  },

  addSeconds: (n) => {
    const remaining = Math.max(0, get().remainingSeconds + n);
    set({ remainingSeconds: remaining });
  },
}));
