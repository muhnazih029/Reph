import type { Exercise, Settings, Workout } from "@reph/contracts";
import { mock } from "bun:test";

// Central hooks mock — bun's module mocks persist for the whole test
// process, so whichever screen test materialises ../api/hooks first must
// provide EVERY export every other screen imports. Register through this
// helper (with per-file overrides) instead of hand-rolling the factory.

export const DEFAULT_SETTINGS: Settings = {
  userId: "00000000-0000-4000-8000-000000000000",
  weightUnit: "kg",
  distanceUnit: "km",
  restTimerSeconds: 90,
  theme: "light",
  language: "en",
  updatedAt: 0,
};

type QueryResult = {
  data: never;
  isPending: boolean;
  error: null;
  refetch: () => Promise<unknown>;
};

const idle = (): QueryResult => ({
  data: [] as never,
  isPending: false,
  error: null,
  refetch: () => Promise.resolve({}),
});

const DEFAULT_HOOKS: Record<string, unknown> = {
  queryKeys: {
    exercises: (filters?: unknown) => ["exercises", filters ?? null] as const,
    exercise: (id: string) => ["exercise", id] as const,
    workouts: (limit?: number) => ["workouts", limit ?? 0] as const,
    workout: (id: string) => ["workout", id] as const,
    workoutActive: ["workout-active"] as const,
    settings: ["settings"] as const,
  },
  fetchSettings: () => Promise.resolve(DEFAULT_SETTINGS),
  useExercises: () => idle(),
  useExercise: () => ({ ...(idle() as QueryResult), data: null }),
  useCreateExercise: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as Exercise),
    isPending: false,
    error: null,
  }),
  useWorkouts: () => idle(),
  useWorkout: () => ({ ...(idle() as QueryResult), data: null }),
  useActiveWorkout: () => ({ ...(idle() as QueryResult), data: null }),
  useCreateWorkout: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as Workout),
    isPending: false,
    error: null,
  }),
  useUpdateWorkout: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as Workout),
    isPending: false,
    error: null,
  }),
  useDeleteWorkout: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({}),
    isPending: false,
    error: null,
  }),
  useSettings: () => ({ ...(idle() as QueryResult), data: DEFAULT_SETTINGS }),
  useUpdateSettings: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as Settings),
    isPending: false,
    error: null,
  }),
  usePhotos: () => idle(),
  useUploadPhoto: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as never),
    isPending: false,
    error: null,
  }),
  useDeletePhoto: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({}),
    isPending: false,
    error: null,
  }),
  useCalendar: () => ({ ...(idle() as QueryResult), data: { days: [] } }),
  useStreak: () => ({ ...(idle() as QueryResult), data: { current: 0, longest: 0 } }),
  useRoutines: () => idle(),
  useCreateRoutine: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as never),
    isPending: false,
    error: null,
  }),
  useDeleteRoutine: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({}),
    isPending: false,
    error: null,
  }),
  useStartRoutine: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as never),
    isPending: false,
    error: null,
  }),
  useBodyMetrics: () => idle(),
  useCreateBodyMetric: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as never),
    isPending: false,
    error: null,
  }),
  useUpdateBodyMetric: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({} as never),
    isPending: false,
    error: null,
  }),
  useDeleteBodyMetric: () => ({
    mutate: () => {},
    mutateAsync: () => Promise.resolve({}),
    isPending: false,
    error: null,
  }),
};

/** Register the shared superset mock with file-specific overrides. */
export function mockHooks(overrides: Record<string, unknown> = {}): void {
  mock.module("../api/hooks", () => ({ ...DEFAULT_HOOKS, ...overrides }));
}
