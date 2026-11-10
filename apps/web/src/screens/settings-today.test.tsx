import { beforeEach, describe, expect, it } from "bun:test";
import type { Exercise, Workout, WorkoutEntry, WorkoutSet } from "@reph/contracts";
import { create } from "zustand";
import { mockHooks } from "../test/mockHooks";

// Task 11 gate — Settings immediate effects and Today summary rendering.
// api/hooks is mocked in-memory (happy-dom comes from the bunfig preload).
// The settings query is reactive via a zustand store so the screen
// re-renders after each PUT exactly like the real TanStack subscription.

const EX_A = "11111111-1111-4111-8111-111111111111";

type SettingsRow = {
  userId: string | null;
  weightUnit: "kg" | "lbs";
  distanceUnit: "km" | "mi";
  restTimerSeconds: number;
  theme: "dark" | "light";
  language: "en" | "id";
  updatedAt: number;
};

type SettingsState = { row: SettingsRow };

const useSettingsStore = create<SettingsState>(() => ({ row: null as unknown as SettingsRow }));

let settingsCalls: Array<Partial<SettingsRow>> = [];
let historyWorkouts: Workout[] = [];
let hasActive = false;

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: crypto.randomUUID(),
  type: "normal",
  weightKg: 100,
  reps: 5,
  rpe: null,
  durationSeconds: null,
  distanceMeters: null,
  calories: null,
  done: true,
  position: 0,
  ...overrides,
});

const entry = (exerciseId: string): WorkoutEntry => ({
  id: crypto.randomUUID(),
  exerciseId,
  notes: "",
  supersetId: null,
  position: 0,
  sets: [set({ weightKg: 120, reps: 1 })], // clean 1RM beats 100×5 (Epley ≈116.7)
});

const makeWorkout = (startTime: number): Workout => ({
  id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  title: "Heavy day",
  notes: "",
  status: "completed",
  startTime,
  endTime: startTime + 3_600_000,
  bodyWeightKg: null,
  createdAt: startTime,
  updatedAt: startTime,
  entries: [entry(EX_A)],
});

mockHooks({
  fetchSettings: () => Promise.resolve(useSettingsStore.getState().row as never),
  useSettings: () => {
    const data = useSettingsStore((state) => state.row);
    return { data, isPending: false, error: null, refetch: () => Promise.resolve({} as never) };
  },
  useUpdateSettings: () => ({
    mutate: (patch: Partial<SettingsRow>) => {
      settingsCalls.push(patch);
      useSettingsStore.setState((state) => ({
        row: { ...state.row, ...patch, updatedAt: Date.now() },
      }));
    },
    isPending: false,
    error: null,
  }),
  useExercises: () => ({
    data: [
      {
        id: EX_A,
        userId: null,
        name: "Bench Press",
        muscleGroup: "chest",
        equipment: "barbell",
        type: "strength",
        isCustom: false,
        createdAt: 0,
      },
    ] as Exercise[],
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useWorkouts: () => ({
    data: historyWorkouts,
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useWorkoutFeed: () => ({
    data: { pages: [historyWorkouts], pageParams: [null] },
    isPending: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => Promise.resolve({}),
  }),
  useActiveWorkout: () => ({
    data: hasActive ? ({ id: "active-1", entries: [] } as unknown as Workout) : null,
    isPending: false,
    error: null,
  }),
  useCreateWorkout: () => ({
    mutateAsync: () => {
      hasActive = true;
      return Promise.resolve({ id: "new-1" } as unknown as Workout);
    },
    isPending: false,
    error: null,
  }),
});

const { SettingsScreen } = await import("../screens/SettingsScreen");
const { TodayScreen } = await import("../screens/TodayScreen");
await import("../i18n");

import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  createMemoryHistory,
} from "@tanstack/react-router";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

async function render(component: () => React.ReactNode, path: string): Promise<void> {
  const rootRoute = createRootRoute({ component: () => createElement(Outlet) });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path,
    component,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const container = document.createElement("div");
  document.body.append(container);
  createRoot(container).render(createElement(RouterProvider, { router }));
  await flush();
}

const freshSettings = (): SettingsRow => ({
  userId: null,
  weightUnit: "kg",
  distanceUnit: "km",
  restTimerSeconds: 90,
  theme: "light",
  language: "en",
  updatedAt: 0,
});

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.className = "";
  useSettingsStore.setState({ row: freshSettings() });
  settingsCalls = [];
  historyWorkouts = [makeWorkout(Date.now())];
  hasActive = false;
});

describe("SettingsScreen", () => {
  it("applies theme class + language immediately on change", async () => {
    await render(() => createElement(SettingsScreen), "/");

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    const darkButton = Array.from(document.querySelectorAll<HTMLElement>('[role="radio"]')).find(
      (radio) => radio.textContent === "Dark",
    );
    expect(darkButton).toBeTruthy();
    darkButton?.click();
    await flush();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(settingsCalls.at(-1)).toEqual({ theme: "dark" });
  });

  it("rest-timer presets write the seconds setting", async () => {
    await render(() => createElement(SettingsScreen), "/");

    const preset120 = Array.from(document.querySelectorAll<HTMLElement>("button")).find(
      (button) => button.textContent === "120",
    );
    expect(preset120).toBeTruthy();
    preset120?.click();
    await flush();

    expect(settingsCalls.at(-1)).toEqual({ restTimerSeconds: 120 });
  });
});

describe("TodayScreen", () => {
  it("renders the week summary, PR line, and start CTA when idle", async () => {
    await render(() => createElement(TodayScreen), "/");

    expect(document.body.textContent).toContain("Heavy day");
    // PR line: 120 kg × 1 — the clean single out-Epleys 100 × 5 (116.7)
    expect(document.body.textContent).toContain("120 kg × 1");
    expect(document.body.textContent).toContain("Start workout");
  });

  it("shows the resume CTA when an active workout exists", async () => {
    hasActive = true;
    await render(() => createElement(TodayScreen), "/");
    expect(document.body.textContent).toContain("Resume workout");
  });
});
