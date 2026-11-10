import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { Exercise, Workout, WorkoutEntry, WorkoutSet } from "@reph/contracts";
import { mockHooks } from "../test/mockHooks";

// Active Workout screen — the pen.dev design put to code: sticky header
// (editable title · elapsed · Finish), the rest-timer banner, entry cards
// with the SET · Previous · KG · Reps · ✓ table, and the "Add exercise"
// button. These assertions lock that structure in.
//
// The stores stay real: the active workout is seeded through the store's
// own setState and the rest timer through its own, so no module mock
// leaks into the other test files (bun module mocks are process-wide).

const EX_ID = "22222222-2222-4222-8222-222222222222";

const exercise: Exercise = {
  id: EX_ID,
  userId: null,
  name: "Barbell Bench Press",
  muscleGroup: "chest",
  equipment: "barbell",
  type: "strength",
  isCustom: false,
  createdAt: 0,
};

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

const entry = (): WorkoutEntry => ({
  id: crypto.randomUUID(),
  exerciseId: EX_ID,
  notes: "",
  supersetId: null,
  position: 0,
  sets: [
    set({ weightKg: 100, reps: 5, done: true }),
    set({ weightKg: null, reps: null, done: false }),
  ],
});

const workout: Workout = {
  id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  title: "Push day — LP1",
  notes: "",
  status: "active",
  startTime: Date.now() - 1000 * 60 * 34,
  endTime: null,
  bodyWeightKg: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  entries: [entry()],
};

// The hooks mock is process-wide in bun (the last registration wins), so
// this file re-registers its own overrides before every test and restores
// the defaults afterwards — otherwise a sibling test file would silently
// swap the exercises away mid-suite.
const hooks = {
  useExercises: () => ({
    data: [exercise],
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({}),
  }),
  useActiveWorkout: () => ({ data: null, isPending: false, error: null }),
};

mockHooks(hooks);

const { useActiveWorkoutStore } = await import("../stores/activeWorkout");
const { useRestTimerStore } = await import("../stores/restTimer");
const { RestTimerToast } = await import("../components/workout/RestTimer");
const { ActiveWorkoutBar } = await import("../components/workout/ActiveWorkoutBar");
const { ActiveWorkoutScreen } = await import("../screens/ActiveWorkoutScreen");
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

// The screen hydrates the active workout on mount; happy-dom has no
// relative-URL fetch, so the transport is stubbed here (and restored
// afterwards — bun runs every test file in one process).
const originalFetch = globalThis.fetch;

function stubFetch(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes("/workouts/active") ? workout : null;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

async function render(): Promise<HTMLElement> {
  const rootRoute = createRootRoute({ component: () => createElement(Outlet) });
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/workout/active",
    component: ActiveWorkoutScreen,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/workout/active"] }),
  });
  const container = document.createElement("div");
  document.body.append(container);
  createRoot(container).render(createElement(RouterProvider, { router }));
  await flush();
  return container;
}

beforeEach(() => {
  mockHooks(hooks);
  stubFetch();
  useActiveWorkoutStore.setState({ workout });
  useRestTimerStore.setState({ remainingSeconds: 0, isRunning: false });
  document.body.innerHTML = "";
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  // hand the shared mock back to the defaults for the next test file
  mockHooks({});
});

async function renderBar(path: string): Promise<HTMLElement> {
  const rootRoute = createRootRoute({
    component: () =>
      createElement("div", null, createElement(ActiveWorkoutBar), createElement(Outlet)),
  });
  const routes = ["/", "/workout/active"].map((routePath) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: routePath,
      component: () => createElement("div", null, "page"),
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const container = document.createElement("div");
  document.body.append(container);
  createRoot(container).render(createElement(RouterProvider, { router }));
  await flush();
  return container;
}

describe("ActiveWorkoutScreen", () => {
  it("renders the sticky header with the editable title, elapsed time and Finish", async () => {
    const container = await render();
    const title = container.querySelector<HTMLInputElement>('input[aria-label="Workout title"]');
    expect(title?.value).toBe("Push day — LP1");
    // elapsed ticker (mm:ss) next to the title
    expect(container.textContent).toMatch(/\d{1,2}:\d{2}/);
    const finish = [...container.querySelectorAll("button")].find((node) =>
      node.textContent?.includes("Finish"),
    );
    expect(finish).toBeTruthy();
    // the back button opens the discard sheet (no ⋯ menu any more)
    const back = container.querySelector('button[aria-label="Back"]');
    expect(back).toBeTruthy();
    expect(container.querySelector('button[aria-label="Workout menu"]')).toBeNull();
  });

  it("renders the set table with aligned column headers and one row per set", async () => {
    const container = await render();
    const headers = [...container.querySelectorAll("[aria-hidden='true'] span")].map(
      (node) => node.textContent,
    );
    expect(headers).toEqual(["SET", "Previous", "KG", "Reps", "✓"]);
    // one check button per set, the first one pressed (done)
    const checks = container.querySelectorAll('button[aria-label="Mark set done"]');
    expect(checks.length).toBe(2);
    expect(checks[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(checks[1]?.getAttribute("aria-pressed")).toBe("false");
  });

  it("offers 'Add set' per entry and 'Add exercise' for the workout", async () => {
    const container = await render();
    const labels = [...container.querySelectorAll("button")].map((node) =>
      node.textContent?.trim(),
    );
    expect(labels).toContain("Add set");
    expect(labels).toContain("Add exercise");
  });

  it("marks the running rest in the header and floats it as a toast", async () => {
    useRestTimerStore.setState({ remainingSeconds: 42, isRunning: true });
    const container = await render();
    // header marker
    expect(container.textContent).toContain("Rest 0:42");
    // the toast lives outside the screen (it floats over every route)
    const toast = document.createElement("div");
    document.body.append(toast);
    createRoot(toast).render(createElement(RestTimerToast));
    await flush();
    const timer = toast.querySelector('[role="timer"]');
    expect(timer).toBeTruthy();
    expect(timer?.textContent).toContain("Rest 0:42");
  });
});

describe("ActiveWorkoutBar", () => {
  it("floats a mini bar outside the workout screen, with a way back", async () => {
    const container = await renderBar("/");
    const bar = container.querySelector('a[href="/workout/active"]');
    expect(bar).toBeTruthy();
    expect(container.textContent).toContain("In progress");
    // the clock ticks: the title shows the elapsed time
    expect(container.textContent).toMatch(/\d{1,2}:\d{2}/);
    // and a discard button guarded by a confirmation
    expect(container.querySelector('button[aria-label="Discard workout"]')).toBeTruthy();
  });

  it("hides on the active-workout screen (the full header is there)", async () => {
    const container = await renderBar("/workout/active");
    expect(container.querySelector('a[href="/workout/active"]')).toBeNull();
  });
});
