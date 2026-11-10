import {
  accountUserSchema,
  authResponseSchema,
  authStatusSchema,
  createWorkoutRequestSchema,
  exerciseSchema,
  finishWorkoutRequestSchema,
  settingsSchema,
  updateSettingsRequestSchema,
  updateWorkoutRequestSchema,
  workoutSchema,
  type AccountUser,
  type AuthResponse,
  type AuthStatus,
  type CreateExerciseInput,
  type Equipment,
  type Exercise,
  type LoginRequest,
  type MuscleGroup,
  type BodyMetric,
  type RegisterRequest,
  type Settings,
  type UpdateWorkoutInput,
  type Workout,
  routineFolderSchema,
  routineSchema,
  type Routine,
  type RoutineFolder,
} from "@reph/contracts";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiGet, apiSend, clearSessionToken, setSessionToken } from "./client";
import { queryKeys } from "./queryKeys";
import { sessionToken } from "../stores/session";
import type { ApiError } from "./client";

// Query/mutation hooks — the only server-state seam for screens
// (docs/guides/DEVELOPMENT.md §5.1). Keys are stable and documented.

export { queryKeys };

/** Query-string filters supported by GET /exercises (PRD-API §3). */
export type ExerciseFilters = {
  q?: string;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
};

/** Shared query-string builder for the exercise endpoints. */
function exerciseQuery(filters: ExerciseFilters, limit: number, offset: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.muscleGroup) params.set("muscleGroup", filters.muscleGroup);
  if (filters.equipment) params.set("equipment", filters.equipment);
  params.set("limit", String(limit));
  if (offset > 0) params.set("offset", String(offset));
  return params.toString();
}

/** Invalidates every query whose key starts with `prefix[0]` — used because
 * functional keys (exercises(filters), workouts(limit)) carry parameters. */
function invalidatePrefix(client: ReturnType<typeof useQueryClient>, prefix: string): void {
  void client.invalidateQueries({ predicate: (query) => query.queryKey[0] === prefix });
}

/** Does this instance already have an owner account? (public route) */
export function useAccountStatus(): UseQueryResult<AuthStatus, ApiError> {
  return useQuery({
    queryKey: queryKeys.authStatus,
    queryFn: () => apiGet("/auth/status", authStatusSchema),
    staleTime: 60_000,
  });
}

/** The signed-in account, or a 401 when this browser has no session. */
export function useAccount(): UseQueryResult<AccountUser, ApiError> {
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: async () => {
      const token = sessionToken();
      try {
        return await apiGet("/auth/me", accountUserSchema);
      } catch (error) {
        // A 401 only ends the session when it is still the token that
        // failed — a sign-in that landed while the old request was in
        // flight must not sign the fresh session out.
        const unauthorized = (error as ApiError).code === "unauthorized";
        if (unauthorized && token && token === sessionToken()) clearSessionToken();
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useLogin(): UseMutationResult<AuthResponse, ApiError, LoginRequest> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) => apiSend("POST", "/auth/login", input, authResponseSchema),
    onSuccess: (response) => {
      setSessionToken(response.token);
      void client.invalidateQueries({ queryKey: queryKeys.account });
    },
  });
}

export function useRegister(): UseMutationResult<AuthResponse, ApiError, RegisterRequest> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) => apiSend("POST", "/auth/register", input, authResponseSchema),
    onSuccess: (response) => {
      setSessionToken(response.token);
      void client.invalidateQueries({ queryKey: queryKeys.account });
      void client.invalidateQueries({ queryKey: queryKeys.authStatus });
    },
  });
}

export function useLogout(): UseMutationResult<void, ApiError, void> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend("POST", "/auth/logout", undefined, z.void()),
    onSettled: () => {
      clearSessionToken();
      // Drop the cached account — react-query keeps the last successful
      // data on error, so an invalidated query would still show the user.
      client.removeQueries({ queryKey: queryKeys.account });
      void client.invalidateQueries({ queryKey: queryKeys.authStatus });
    },
  });
}

export function useExercises(
  filters?: ExerciseFilters,
  page?: { limit?: number; offset?: number },
): UseQueryResult<Exercise[], ApiError> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.muscleGroup) params.set("muscleGroup", filters.muscleGroup);
  if (filters?.equipment) params.set("equipment", filters.equipment);
  const limit = page?.limit ?? 200;
  const offset = page?.offset ?? 0;
  params.set("limit", String(limit));
  if (offset > 0) params.set("offset", String(offset));
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.exercises(filters, limit, offset),
    queryFn: () => apiGet(`/exercises?${qs}`, z.array(exerciseSchema)),
  });
}

/** The exercise library, paged — one screenful at a time (the library
 *  holds ~150 rows, and the feed only asks for what is on screen). */
export function useExerciseFeed(
  filters: ExerciseFilters,
  pageSize = 40,
): UseInfiniteQueryResult<{ pages: Exercise[][]; pageParams: number[] }, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.exerciseFeed(filters, pageSize),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiGet(`/exercises?${exerciseQuery(filters, pageSize, pageParam)}`, z.array(exerciseSchema)),
    getNextPageParam: (last, pages) =>
      last.length < pageSize ? undefined : pages.length * pageSize,
  });
}

/** The workout feed — newest first, cursor-paged on start_time
 *  (docs/specs/PRD-API.md §2: `before`). */
export function useWorkoutFeed(
  pageSize = 10,
): UseInfiniteQueryResult<{ pages: Workout[][]; pageParams: (number | null)[] }, ApiError> {
  return useInfiniteQuery({
    queryKey: queryKeys.workoutFeed(pageSize),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ limit: String(pageSize) });
      if (pageParam !== null) qs.set("before", String(pageParam));
      return apiGet(`/workouts?${qs}`, z.array(workoutSchema));
    },
    getNextPageParam: (last, _pages) => {
      if (last.length < pageSize) return undefined;
      const oldest = last[last.length - 1];
      return oldest ? oldest.startTime : undefined;
    },
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

export function useUpdateRoutine(
  id: string,
): UseMutationResult<
  Routine,
  ApiError,
  { expectedUpdatedAt: number; name?: string; entries?: Routine["entries"] }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) => apiSend("PATCH", `/routines/${id}`, input, routineSchema),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.routine(id) });
      void client.invalidateQueries({ queryKey: queryKeys.routines });
    },
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

import {
  progressPhotoSchema,
  type ProgressPhoto,
  bodyMetricSchema,
  createBodyMetricRequestSchema,
} from "@reph/contracts";

export function usePhotos(
  limit = 20,
  offset = 0,
  workoutId?: string,
): UseQueryResult<ProgressPhoto[], ApiError> {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (workoutId) qs.set("workoutId", workoutId);
  return useQuery({
    queryKey: ["photos", limit, offset, workoutId ?? null] as const,
    queryFn: () => apiGet(`/photos?${qs.toString()}`, progressPhotoSchema.array()),
  });
}

export function useUploadPhoto(): UseMutationResult<
  ProgressPhoto,
  ApiError,
  { file: File; workoutId?: string }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, workoutId }) => {
      const form = new FormData();
      form.append("file", file);
      if (workoutId) form.append("workoutId", workoutId);
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

// ---------- Body metrics (Phase 3 Track A) ----------

export function useBodyMetrics(): UseQueryResult<BodyMetric[], ApiError> {
  return useQuery({
    queryKey: ["body-metrics"] as const,
    queryFn: () => apiGet("/body-metrics", bodyMetricSchema.array()),
  });
}

export function useCreateBodyMetric(): UseMutationResult<
  BodyMetric,
  ApiError,
  { weightKg?: number | null; notes?: string; recordedAt?: number }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      apiSend(
        "POST",
        "/body-metrics",
        createBodyMetricRequestSchema.parse(input),
        bodyMetricSchema,
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["body-metrics"] }),
  });
}

export function useUpdateBodyMetric(): UseMutationResult<
  BodyMetric,
  ApiError,
  { id: string; weightKg?: number | null; notes?: string; recordedAt?: number }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...rest }) =>
      apiSend(
        "PATCH",
        `/body-metrics/${id}`,
        createBodyMetricRequestSchema.parse(rest),
        bodyMetricSchema,
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["body-metrics"] }),
  });
}

export function useDeleteBodyMetric(): UseMutationResult<void, ApiError, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiSend("DELETE", `/body-metrics/${id}`, undefined, z.void()),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["body-metrics"] }),
  });
}
