import {
  createWorkoutRequestSchema,
  exerciseSchema,
  finishWorkoutRequestSchema,
  settingsSchema,
  updateSettingsRequestSchema,
  updateWorkoutRequestSchema,
  workoutSchema,
  type CreateExerciseInput,
  type Exercise,
  type Settings,
  type UpdateWorkoutInput,
  type Workout,
} from "@reph/contracts";
import { z } from "zod";
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
  exercises: ["exercises"] as const,
  exercise: (id: string) => ["exercise", id] as const,
  workouts: (limit?: number) => ["workouts", limit ?? 0] as const,
  workout: (id: string) => ["workout", id] as const,
  workoutActive: ["workout-active"] as const,
  settings: ["settings"] as const,
};

export function useExercises(): UseQueryResult<Exercise[], ApiError> {
  return useQuery({
    queryKey: queryKeys.exercises,
    queryFn: () => apiGet("/exercises", z.array(exerciseSchema)),
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
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.exercises }),
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
      void client.invalidateQueries({ queryKey: queryKeys.workouts() });
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
      void client.invalidateQueries({ queryKey: queryKeys.workouts() });
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
      void client.invalidateQueries({ queryKey: queryKeys.workouts() });
    },
  });
}

export function useDeleteWorkout(): UseMutationResult<void, ApiError, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiSend("DELETE", `/workouts/${id}`, undefined, z.void()),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.workoutActive });
      void client.invalidateQueries({ queryKey: queryKeys.workouts() });
    },
  });
}

export function useSettings(): UseQueryResult<Settings, ApiError> {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiGet("/settings", settingsSchema),
  });
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
