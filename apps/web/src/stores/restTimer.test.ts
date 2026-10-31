import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// module mocks persist for the whole test process — give the settings
// cache a shape (this also overrides whatever other files mocked before)
const settingsHolder: { cache?: { restTimerSeconds?: number } } = {};
mock.module("../api/queryClient", () => ({
  queryClient: {
    invalidateQueries: () => {},
    getQueryData: (key: unknown[]) => (key[0] === "settings" ? settingsHolder.cache : undefined),
  },
}));

const { useRestTimerStore } = await import("./restTimer");
void useRestTimerStore;

// Task 9 gate — rest timer store (docs/plans/phase-1-mvp.md, Task 9).
// Short real-time intervals keep the tick logic honest without fake timers.

const store = () => useRestTimerStore.getState();

beforeEach(() => {
  useRestTimerStore.setState({
    totalSeconds: 90,
    remainingSeconds: 0,
    isRunning: false,
  });
});

afterEach(() => {
  store().cancel();
});

describe("restTimer store", () => {
  it("starts timer with default or custom duration and decrements on tick", async () => {
    store().start(5);
    expect(store().isRunning).toBe(true);
    expect(store().totalSeconds).toBe(5);
    expect(store().remainingSeconds).toBe(5);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(store().remainingSeconds).toBe(4);
  });

  it("falls back to the cached settings duration when started without arguments", () => {
    settingsHolder.cache = { restTimerSeconds: 45 };
    try {
      store().start();
      expect(store().totalSeconds).toBe(45);
      expect(store().remainingSeconds).toBe(45);
    } finally {
      settingsHolder.cache = undefined;
      store().cancel();
    }
  });

  it("pauses and resumes without resetting remaining seconds", async () => {
    store().start(10);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const remainingBeforePause = store().remainingSeconds;

    store().pause();
    expect(store().isRunning).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(store().remainingSeconds).toBe(remainingBeforePause);

    store().resume();
    expect(store().isRunning).toBe(true);
  });

  it("addSeconds clamps remaining to zero or adds time", async () => {
    store().start(30);
    store().addSeconds(15);
    expect(store().remainingSeconds).toBe(45);

    store().addSeconds(-100);
    expect(store().remainingSeconds).toBe(0);
  });

  it("stops automatically at zero and sets isRunning: false", async () => {
    store().start(1);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(store().remainingSeconds).toBe(0);
    expect(store().isRunning).toBe(false);
  });

  it("beeps once at zero and vibrates when the platform supports it", async () => {
    // stub WebAudio + navigator.vibrate before the timer expires
    let oscillatorsStarted = 0;
    let vibrated = 0;

    class FakeOscillator {
      connect(): void {}
      start(): void {
        oscillatorsStarted++;
      }
      stop(): void {}
    }
    class FakeAudioContext {
      destination: { type: string } = { type: "speaker" };
      currentTime = 0;
      createOscillator(): FakeOscillator {
        return new FakeOscillator();
      }
    }

    const originalAudioContext = (globalThis as Record<string, unknown>).AudioContext;
    const originalVibrate = Object.getOwnPropertyDescriptor(navigator, "vibrate");
    Object.defineProperty(globalThis, "AudioContext", {
      value: FakeAudioContext,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, "vibrate", {
      value: () => {
        vibrated++;
        return true;
      },
      configurable: true,
    });

    try {
      store().start(1);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      expect(oscillatorsStarted).toBe(1);
      expect(vibrated).toBe(1);
      expect(store().isRunning).toBe(false);
    } finally {
      if (originalAudioContext === undefined)
        delete (globalThis as Record<string, unknown>).AudioContext;
      else (globalThis as Record<string, unknown>).AudioContext = originalAudioContext;
      if (originalVibrate) Object.defineProperty(navigator, "vibrate", originalVibrate);
      else delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    }
  });

  it("does not throw when WebAudio is unavailable", async () => {
    const originalAudioContext = (globalThis as Record<string, unknown>).AudioContext;
    delete (globalThis as Record<string, unknown>).AudioContext;
    try {
      store().start(1);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      expect(store().isRunning).toBe(false);
    } finally {
      if (originalAudioContext !== undefined) {
        (globalThis as Record<string, unknown>).AudioContext = originalAudioContext;
      }
    }
  });
});
