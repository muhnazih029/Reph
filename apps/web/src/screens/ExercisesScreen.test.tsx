import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Exercise } from "@reph/contracts";

// DOM globals come from the bunfig preload (apps/web/src/test/dom.ts).

// Component tests for the library screen (Task 7). The api/hooks module is
// mocked so no QueryClientProvider or real fetch is in play; a tiny memory
// router supplies the Link/useNavigate context the screen needs.

type filtersCall = { q?: string; muscleGroup?: string } | undefined;
const exercisesCalls: filtersCall[] = [];
let library: Exercise[] = [];
let createdInputs: Array<Record<string, unknown>> = [];

mock.module("../api/hooks", () => ({
  useExercises: (filters?: { q?: string; muscleGroup?: string; equipment?: string }) => {
    exercisesCalls.push(filters);
    return {
      data: library,
      isPending: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve({} as never),
    };
  },
  useCreateExercise: () => ({
    mutate: (
      input: Record<string, unknown>,
      options?: { onSuccess?: (result: Exercise) => void },
    ) => {
      createdInputs.push(input);
      options?.onSuccess?.(library[0] as Exercise);
    },
    isPending: false,
    isError: false,
    error: null,
  }),
  // process-wide mocks leak across test files — cover the exports other
  // screens import so their module evaluation never hits the real hooks
  useWorkouts: () => ({
    data: [],
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useWorkout: () => ({
    data: null,
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useActiveWorkout: () => ({ data: null, isPending: false, error: null }),
  useSettings: () => ({
    data: {
      weightUnit: "kg",
      distanceUnit: "km",
      restTimerSeconds: 90,
      theme: "system",
      language: "en",
    },
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useExercise: () => ({
    data: null,
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useStatsSummary: () => ({
    data: null,
    isPending: false,
    error: null,
    refetch: () => Promise.resolve({} as never),
  }),
  useUpdateWorkout: () => ({
    mutate: (
      _payload: unknown,
      options?: { onSuccess?: () => void; onError?: (error: unknown) => void },
    ) => {
      options?.onSuccess?.();
    },
    isPending: false,
    error: null,
  }),
  useDeleteWorkout: () => ({
    mutateAsync: () => Promise.resolve(undefined as never),
    isPending: false,
    error: null,
  }),
}));

const { ExercisesScreen } = await import("./ExercisesScreen");
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

const uuid = () => crypto.randomUUID();

const exercise = (name: string, muscleGroup: Exercise["muscleGroup"]): Exercise => ({
  id: uuid(),
  userId: null,
  name,
  muscleGroup,
  equipment: "barbell",
  type: "strength",
  isCustom: false,
  createdAt: Date.now(),
});

async function renderScreen(): Promise<void> {
  const rootRoute = createRootRoute({ component: () => createElement(Outlet) });
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/exercises",
    component: () => createElement(ExercisesScreen),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/exercises"] }),
  });
  const container = document.createElement("div");
  document.body.append(container);
  createRoot(container).render(createElement(RouterProvider, { router }));
  await flush();
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 30));

function searchInput(): HTMLInputElement {
  const input = document.querySelector('input[type="search"]');
  if (!(input instanceof HTMLInputElement)) throw new Error("search input not rendered");
  return input;
}

function typeInto(input: HTMLInputElement, value: string): void {
  // bypass React's installed value tracker (same trick as testing-library)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function click(target: Element): void {
  target.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
  exercisesCalls.length = 0;
  createdInputs.length = 0;
  library = [exercise("Bench Press", "chest"), exercise("Back Squat", "thighs")];
});

describe("ExercisesScreen search", () => {
  it("debounces the query param (200 ms) before calling useExercises", async () => {
    await renderScreen();
    expect(exercisesCalls.length).toBeLessThanOrEqual(2); // initial mount (maybe StrictMode-free single)

    typeInto(searchInput(), "bench");
    await flush(); // still inside the debounce window
    expect(exercisesCalls.at(-1)?.q).not.toBe("bench");

    await new Promise((resolve) => setTimeout(resolve, 250));
    const last = exercisesCalls.at(-1);
    expect(last?.q).toBe("bench");
  });

  it("renders one row per exercise after search", async () => {
    await renderScreen();
    expect(document.body.textContent).toContain("Bench Press");
    expect(document.body.textContent).toContain("Back Squat");
    expect(document.querySelector('a[href^="/exercises/"]')).toBeTruthy();
  });
});

describe("ExercisesScreen create form", () => {
  it("disables submit until the name passes validation, then creates", async () => {
    await renderScreen();

    const fab = Array.from(document.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "New exercise",
    );
    expect(fab).toBeTruthy();
    if (fab) click(fab);
    await flush();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    const nameInput = document.querySelector('input[aria-label="Name"]');
    if (!(nameInput instanceof HTMLInputElement)) throw new Error("name input not rendered");

    const save = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
    ).find((button) => button.textContent === "Save" && button.getAttribute("type") === "submit");
    expect(save).toBeTruthy();
    expect(save?.disabled).toBe(true); // empty name → validation blocks submit

    // submit stays blocked while the name is missing
    typeInto(nameInput, "   ");
    await flush();
    expect(save?.disabled).toBe(true);

    typeInto(nameInput, "Hammer Curl");
    await flush();
    expect(save?.disabled).toBe(false);
    const form = dialog?.querySelector("form");
    if (!form) throw new Error("create form not rendered");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flush();

    expect(createdInputs).toHaveLength(1);
    expect(createdInputs[0]).toMatchObject({ name: "Hammer Curl", type: "strength" });

    // sheet closes on success
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
