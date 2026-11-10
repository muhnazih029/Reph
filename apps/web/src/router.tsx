import { createRootRoute, createRoute, createRouter, redirect, useParams } from "@tanstack/react-router";
import { AppShell } from "./components/layout/AppShell";
import { ActiveWorkoutScreen } from "./screens/ActiveWorkoutScreen";
import { ExerciseDetailScreen } from "./screens/ExerciseDetailScreen";
import { WorkoutDetailScreen } from "./screens/WorkoutDetailScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { WeightScreen } from "./screens/WeightScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { WorkoutScreen } from "./screens/WorkoutScreen";
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

// The exercise library lives inside the Workout tab (Routines | Exercises),
// so /exercises only redirects there — old links and PWA shortcuts still work.
const exercisesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/exercises",
  beforeLoad: () => {
    throw redirect({ to: "/workout" });
  },
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

// Sign in — the shell renders it (AppShell) so it covers the whole
// viewport; the route exists so navigation can reach it.
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginScreen,
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

// Routines live inside the Workout tab, so /routines only redirects there.
const routinesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/routines",
  beforeLoad: () => {
    throw redirect({ to: "/workout" });
  },
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
  // `?tab=exercises` keeps the library segment active, so back-navigation
  // from an exercise detail lands on Exercises, not on Routines.
  validateSearch: (search): { tab?: "routines" | "exercises" } => ({
    tab: search.tab === "exercises" ? "exercises" : search.tab === "routines" ? "routines" : undefined,
  }),
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
    loginRoute,
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
