// Query keys — the single registry for server-state cache keys.
//
// Lives outside hooks.ts so stores (which run outside React) can invalidate
// exactly the same keys the hooks read (ADR-004 online-first read cache).
// `workoutActive` matters most: discarding or finishing a workout must
// clear it, otherwise the Today screen keeps offering "Resume" for a
// workout that no longer exists.

export const queryKeys = {
  authStatus: ["auth-status"] as const,
  account: ["account"] as const,
  exercises: (filters?: unknown, limit = 200, offset = 0) =>
    ["exercises", filters ?? null, limit, offset] as const,
  exerciseFeed: (filters: unknown, pageSize: number) =>
    ["exercises-feed", filters, pageSize] as const,
  workoutFeed: (pageSize: number) => ["workouts-feed", pageSize] as const,
  exercise: (id: string) => ["exercise", id] as const,
  workouts: (limit?: number) => ["workouts", limit ?? 0] as const,
  workout: (id: string) => ["workout", id] as const,
  workoutActive: ["workout-active"] as const,
  settings: ["settings"] as const,
  routines: ["routines"] as const,
  routine: (id: string) => ["routine", id] as const,
  routineFolders: ["routine-folders"] as const,
};
