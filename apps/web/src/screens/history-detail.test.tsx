import { beforeEach, describe, expect, it } from "bun:test";
import type { Workout, WorkoutEntry, WorkoutSet } from "@reph/contracts";
import { mockHooks } from "../test/mockHooks";

// Task 10 gate — history grouping, detail rendering, conflict path.
// api/hooks is mocked in-memory (happy-dom comes from the bunfig preload).

const EX_A = crypto.randomUUID();

let historyWorkouts: Workout[] = [];
let detailWorkout: Workout | null = null;
let updateError: { code: string; status: number } | null = null;
const historyRefetches: number[] = [];

class MockApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: crypto.randomUUID(),
  type: "normal",
  weightKg: 80,
  reps: 5,
  rpe: 8,
  durationSeconds: null,
  distanceMeters: null,
  calories: null,
  done: true,
  position: 0,
  ...overrides,
});

const entry = (): WorkoutEntry => ({
  id: crypto.randomUUID(),
  exerciseId: EX_A,
  notes: "",
  supersetId: null,
  position: 0,
  sets: [set()],
});

const makeWorkout = (startTime: number, overrides: Partial<Workout> = {}): Workout => ({
  id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  title: "Push day",
  notes: "",
  status: "completed",
  startTime,
  endTime: startTime + 3_600_000,
  bodyWeightKg: null,
  createdAt: startTime,
  updatedAt: startTime,
  entries: [entry()],
  ...overrides,
});

mockHooks({
  useExercises: (query?: { q?: string }) => ({
    data:
      query?.q && !"Bench Press".toLowerCase().includes(query.q.toLowerCase())
        ? []
        : [
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
          ],
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useWorkouts: () => ({
    data: historyWorkouts,
    isPending: false,
    error: null,
    refetch: () => {
      historyRefetches.push(1);
      return Promise.resolve({} as never);
    },
  }),
  useWorkout: () => ({
    data: detailWorkout,
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useActiveWorkout: () => ({ data: null, isPending: false, error: null }),
  useSettings: () => ({
    data: { weightUnit: "kg", distanceUnit: "km" },
    isPending: false,
    error: null,
  }),
  useExercise: () => ({
    data: {
      id: EX_A,
      userId: null,
      name: "Bench Press",
      muscleGroup: "chest",
      equipment: "barbell",
      type: "strength",
      isCustom: false,
      createdAt: 0,
    },
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useUpdateWorkout: () => ({
    mutate: (
      _payload: unknown,
      options?: { onSuccess?: () => void; onError?: (error: unknown) => void },
    ) => {
      if (updateError) {
        options?.onError?.(new MockApiError(updateError.code, updateError.status, "conflict"));
      } else {
        options?.onSuccess?.();
      }
    },
    isPending: false,
    error: null,
  }),
  useDeleteWorkout: () => ({
    mutateAsync: () => Promise.resolve(undefined as never),
    isPending: false,
    error: null,
  }),
});

const { HistoryScreen } = await import("../screens/HistoryScreen");
const { WorkoutDetailScreen } = await import("../screens/WorkoutDetailScreen");
const { format } = await import("date-fns");
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

async function render(component: () => React.ReactNode, path: string): Promise<void> {
  const rootRoute = createRootRoute({ component: () => createElement(Outlet) });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/history",
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

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

beforeEach(() => {
  document.body.innerHTML = "";
  historyWorkouts = [];
  detailWorkout = null;
  updateError = null;
  historyRefetches.length = 0;
});

describe("HistoryScreen grouping", () => {
  it("groups workouts across two months into two ascending headers", async () => {
    const today = Date.now();
    const someTimeThisMonth = today - 2 * 86_400_000;
    const someTimeLastMonth = today - 40 * 86_400_000;
    historyWorkouts = [
      makeWorkout(someTimeThisMonth),
      makeWorkout(someTimeLastMonth, { title: "Old heavy day" }),
    ];

    await render(() => createElement(HistoryScreen), "/history");

    const headers = Array.from(document.querySelectorAll("h3")).map((node) => node.textContent);
    const thisMonth = format(someTimeThisMonth, "LLLL yyyy");
    const lastMonth = format(someTimeLastMonth, "LLLL yyyy");
    const strings = headers.map(String);
    expect(strings.lastIndexOf(thisMonth)).toBeLessThan(strings.indexOf(lastMonth));
  });
});

describe("WorkoutDetailScreen", () => {
  it("renders sets in read-only mode", async () => {
    detailWorkout = makeWorkout(Date.now());
    await render(() => createElement(WorkoutDetailScreen, { id: detailWorkout!.id }), "/history");

    expect(document.body.textContent).toContain("Bench Press");
    expect(document.body.textContent).toContain("80 kg");
    // stats strip
    expect(document.body.textContent).toContain("Volume");
  });

  it("shows the reload prompt when saving hits a 409 conflict", async () => {
    detailWorkout = makeWorkout(Date.now());
    updateError = { code: "conflict", status: 409 };

    await render(() => createElement(WorkoutDetailScreen, { id: detailWorkout!.id }), "/history");

    // enter edit mode → save (Edit lives in the ⋯ menu)
    const menuButton = document.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
    expect(menuButton).toBeTruthy();
    if (menuButton) menuButton.click();
    await flush();

    const editButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Edit",
    );
    expect(editButton).toBeTruthy();
    if (editButton) editButton.click();
    await flush();

    // save lives in the ⋯ menu in edit mode
    const editMenuButton = document.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
    if (editMenuButton) editMenuButton.click();
    await flush();

    const save = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Save",
    );
    expect(save).toBeTruthy();
    if (save) save.click();
    await flush();

    expect(document.body.textContent).toContain("changed on the server");

    // reload resolves the prompt and exits edit mode
    const reload = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Reload",
    );
    if (reload) reload.click();
    await flush();
    expect(document.body.textContent).not.toContain("changed on the server");
  });
});
