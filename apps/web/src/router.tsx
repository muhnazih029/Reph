import { createRootRoute, createRoute, createRouter, useParams } from "@tanstack/react-router";
import { AppShell } from "./components/layout/AppShell";
import { ActiveWorkoutScreen } from "./screens/ActiveWorkoutScreen";
import { ExerciseDetailScreen } from "./screens/ExerciseDetailScreen";
import { WorkoutDetailScreen } from "./screens/WorkoutDetailScreen";
import { ExercisesScreen } from "./screens/ExercisesScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { WeightScreen } from "./screens/WeightScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { WorkoutScreen } from "./screens/WorkoutScreen";
import { RoutinesScreen } from "./screens/RoutinesScreen";
import { PhotosScreen } from "./screens/PhotosScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { RoutineEditorScreen } from "./screens/RoutineEditorScreen";
import { YearInReviewScreen } from "./screens/YearInReviewScreen";
import { StatsScreen } from "./screens/StatsScreen";

// Code-based typed route tree (docs/specs/PRD-FE.md §1). Logging routes
// land in Task 9; detail routes in Tasks 7/10.

const rootRoute = createRootRoute({ component: AppShell });

const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: TodayScreen,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryScreen,
  // `?view=insight` persists the active mode so back-navigation from
  // satellite screens (weight/stats/recap) lands on Insight, not Log.
  validateSearch: (search): { view?: "insight" | "log" } => ({
    view: search.view === "insight" ? "insight" : search.view === "log" ? "log" : undefined,
  }),
});

const exercisesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exercises",
  component: ExercisesScreen,
});

const exerciseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exercises/$id",
  component: function ExerciseDetailRoute() {
    const { id } = useParams({ strict: false });
    if (!id) throw new Error("missing :id route param");
    return <ExerciseDetailScreen id={id} />;
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsScreen,
});

// Redirect guard (Task 9): no active workout → home. The screen hydrates
// on mount and bounces itself; the route may still render loading state.
const activeWorkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workout/active",
  component: ActiveWorkoutScreen,
});

const workoutDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workouts/$id",
  component: function WorkoutDetailRoute() {
    const { id } = useParams({ strict: false });
    if (!id) throw new Error("missing :id route param");
    return <WorkoutDetailScreen id={id} />;
  },
});

const routinesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/routines",
  component: RoutinesScreen,
});

const routineEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/routines/$id",
  component: function RoutineEditorRoute() {
    const { id } = useParams({ strict: false });
    if (!id) throw new Error("missing :id route param");
    return <RoutineEditorScreen id={id} />;
  },
});

const photosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/photos",
  component: PhotosScreen,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarScreen,
});

const workoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workout",
  component: WorkoutScreen,
});

const weightRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/weight",
  component: WeightScreen,
});

const yearInReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/year-in-review",
  component: YearInReviewScreen,
});

const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  component: StatsScreen,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    todayRoute,
    workoutRoute,
    weightRoute,
    historyRoute,
    exercisesRoute,
    exerciseDetailRoute,
    settingsRoute,
    activeWorkoutRoute,
    workoutDetailRoute,
    routinesRoute,
    routineEditorRoute,
    photosRoute,
    calendarRoute,
    yearInReviewRoute,
    statsRoute,
  ]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
