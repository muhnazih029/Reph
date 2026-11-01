import {
  createWorkoutRequestSchema,
  exerciseSchema,
  finishWorkoutRequestSchema,
  settingsSchema,
  updateSettingsRequestSchema,
  updateWorkoutRequestSchema,
  workoutSchema,
  type CreateExerciseInput,
  type Equipment,
  type Exercise,
  type MuscleGroup,
  type Settings,
  type UpdateWorkoutInput,
  type Workout,
  routineFolderSchema,
  routineSchema,
  type Routine,
  type RoutineFolder,
} from "@reph/contracts";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiGet, apiSend } from "./client";
import type { ApiError } from "./client";

// Query/mutation hooks — the only server-state seam for screens
// (docs/guides/DEVELOPMENT.md §5.1). Keys are stable and documented.

export const queryKeys = {
  exercises: (filters?: ExerciseFilters) => ["exercises", filters ?? null] as const,
  exercise: (id: string) => ["exercise", id] as const,
  workouts: (limit?: number) => ["workouts", limit ?? 0] as const,
  workout: (id: string) => ["workout", id] as const,
  workoutActive: ["workout-active"] as const,
  settings: ["settings"] as const,
  routines: ["routines"] as const,
  routine: (id: string) => ["routine", id] as const,
  routineFolders: ["routine-folders"] as const,
};

/** Query-string filters supported by GET /exercises (PRD-API §3). */
export type ExerciseFilters = {
  q?: string;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
};

/** Invalidates every query whose key starts with `prefix[0]` — used because
 * functional keys (exercises(filters), workouts(limit)) carry parameters. */
function invalidatePrefix(client: ReturnType<typeof useQueryClient>, prefix: string): void {
  void client.invalidateQueries({ predicate: (query) => query.queryKey[0] === prefix });
}

export function useExercises(filters?: ExerciseFilters): UseQueryResult<Exercise[], ApiError> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.muscleGroup) params.set("muscleGroup", filters.muscleGroup);
  if (filters?.equipment) params.set("equipment", filters.equipment);
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.exercises(filters),
    queryFn: () => apiGet(`/exercises${qs ? `?${qs}` : ""}`, z.array(exerciseSchema)),
  });
}

export function useExercise(id: string): UseQueryResult<Exercise, ApiError> {
  return useQuery({
    queryKey: queryKeys.exercise(id),
    queryFn: () => apiGet(`/exercises/${id}`, exerciseSchema),
  });
}

export function useCreateExercise(): UseMutationResult<Exercise, ApiError, CreateExerciseInput> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) => apiSend("POST", "/exercises", input, exerciseSchema),
    onSuccess: (exercise) => {
      invalidatePrefix(client, "exercises");
      void client.invalidateQueries({ queryKey: queryKeys.exercise(exercise.id) });
    },
  });
}

export function useWorkouts(limit?: number): UseQueryResult<Workout[], ApiError> {
  return useQuery({
    queryKey: queryKeys.workouts(limit),
    queryFn: () => apiGet(`/workouts${limit ? `?limit=${limit}` : ""}`, z.array(workoutSchema)),
  });
}

export function useWorkout(id: string): UseQueryResult<Workout, ApiError> {
  return useQuery({
    queryKey: queryKeys.workout(id),
    queryFn: () => apiGet(`/workouts/${id}`, workoutSchema),
  });
}

export function useActiveWorkout(): UseQueryResult<Workout | null, ApiError> {
  return useQuery({
    queryKey: queryKeys.workoutActive,
    queryFn: () => apiGet("/workouts/active", workoutSchema.nullable()),
  });
}

export function useCreateWorkout(): UseMutationResult<Workout, ApiError, { title?: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      apiSend("POST", "/workouts", createWorkoutRequestSchema.parse(input), workoutSchema),
    onSuccess: (workout) => {
      void client.invalidateQueries({ queryKey: queryKeys.workoutActive });
      invalidatePrefix(client, "workouts");
      void client.invalidateQueries({ queryKey: queryKeys.workout(workout.id) });
    },
  });
}

export function useUpdateWorkout(
  id: string,
): UseMutationResult<Workout, ApiError, UpdateWorkoutInput> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      apiSend("PATCH", `/workouts/${id}`, updateWorkoutRequestSchema.parse(input), workoutSchema),
    onSuccess: (workout) => {
      void client.invalidateQueries({ queryKey: queryKeys.workout(workout.id) });
      void client.invalidateQueries({ queryKey: queryKeys.workoutActive });
      invalidatePrefix(client, "workouts");
    },
  });
}

export function useFinishWorkout(): UseMutationResult<Workout, ApiError, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const mirror =
        client.getQueryData<Workout>(queryKeys.workoutActive) ??
        client.getQueryData<Workout>(queryKeys.workout(id));
      return apiSend(
        "POST",
        `/workouts/${id}/finish`,
        finishWorkoutRequestSchema.parse({ expectedUpdatedAt: mirror?.updatedAt ?? 0 }),
        workoutSchema,
      );
    },
    onSuccess: (workout) => {
      void client.invalidateQueries({ queryKey: queryKeys.workoutActive });
      void client.invalidateQueries({ queryKey: queryKeys.workout(workout.id) });
      invalidatePrefix(client, "workouts");
    },
  });
}

export function useDeleteWorkout(): UseMutationResult<void, ApiError, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiSend("DELETE", `/workouts/${id}`, undefined, z.void()),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.workoutActive });
      invalidatePrefix(client, "workouts");
    },
  });
}

export function useSettings(): UseQueryResult<Settings, ApiError> {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettings,
  });
}

/** standalone fetch for boot-time consumers (main.tsx applies theme/language) */
export function fetchSettings(): Promise<Settings> {
  return apiGet("/settings", settingsSchema);
}

export function useUpdateSettings(): UseMutationResult<
  Settings,
  ApiError,
  Partial<Omit<Settings, "userId" | "updatedAt">>
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      apiSend("PUT", "/settings", updateSettingsRequestSchema.parse(input), settingsSchema),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}

// ---------- Routines (Phase 2 Track A) ----------

import { createRoutineRequestSchema } from "@reph/contracts";
import { z } from "zod";

export function useRoutineFolders(): UseQueryResult<RoutineFolder[], ApiError> {
  return useQuery({
    queryKey: queryKeys.routineFolders,
    queryFn: () => apiGet("/routines/routine-folders", routineFolderSchema.array()),
  });
}

export function useRoutines(folderId?: string): UseQueryResult<Routine[], ApiError> {
  const qs = folderId ? `?folderId=${folderId}` : "";
  return useQuery({
    queryKey: queryKeys.routines,
    queryFn: () => apiGet(`/routines${qs}`, routineSchema.array()),
  });
}

export function useRoutine(id: string): UseQueryResult<Routine, ApiError> {
  return useQuery({
    queryKey: queryKeys.routine(id),
    queryFn: () => apiGet(`/routines/${id}`, routineSchema),
  });
}

export function useCreateRoutine(): UseMutationResult<Routine, ApiError, { name: string }> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      apiSend("POST", "/routines", createRoutineRequestSchema.parse(input), routineSchema),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.routines }),
  });
}

export function useDeleteRoutine(): UseMutationResult<void, ApiError, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiSend("DELETE", `/routines/${id}`, undefined, z.void()),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.routines }),
  });
}

export function useStartRoutine(): UseMutationResult<Workout, ApiError, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiSend("POST", `/routines/${id}/start`, undefined, workoutSchema),
    onSuccess: (workout) => {
      void client.invalidateQueries({ queryKey: queryKeys.workoutActive });
      void client.invalidateQueries({ queryKey: queryKeys.workout(workout.id) });
      void client.invalidateQueries({ queryKey: queryKeys.routines });
    },
  });
}

// ---------- Photos (Phase 2 Track B) ----------

import { progressPhotoSchema, type ProgressPhoto } from "@reph/contracts";

export function usePhotos(): UseQueryResult<ProgressPhoto[], ApiError> {
  return useQuery({
    queryKey: ["photos"] as const,
    queryFn: () => apiGet("/photos", progressPhotoSchema.array()),
  });
}

export function useUploadPhoto(): UseMutationResult<ProgressPhoto, ApiError, File> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/photos", {
        method: "POST",
        headers: { authorization: `Bearer ${import.meta.env.VITE_REPH_TOKEN ?? ""}` },
        body: form,
      });
      if (!res.ok) throw new Error("upload failed");
      return progressPhotoSchema.parse(await res.json());
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ["photos"] }),
  });
}

export function useDeletePhoto(): UseMutationResult<void, ApiError, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiSend("DELETE", `/photos/${id}`, undefined, z.void()),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["photos"] }),
  });
}

// ---------- Calendar / Streak (Phase 2 Track C) ----------

export function useCalendar(
  year: number,
  month: number,
): UseQueryResult<
  { year: number; month: number; days: { date: string; count: number }[] },
  ApiError
> {
  return useQuery({
    queryKey: ["calendar", year, month] as const,
    queryFn: () =>
      apiGet(
        `/stats/calendar?year=${year}&month=${month}`,
        z.object({
          year: z.number(),
          month: z.number(),
          days: z.array(z.object({ date: z.string(), count: z.number() })),
        }),
      ),
  });
}

export function useStreak(): UseQueryResult<{ current: number; longest: number }, ApiError> {
  return useQuery({
    queryKey: ["streak"] as const,
    queryFn: () => apiGet("/stats/streak", z.object({ current: z.number(), longest: z.number() })),
  });
}
