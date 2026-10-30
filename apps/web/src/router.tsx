import { createRootRoute, createRoute, createRouter, useParams } from "@tanstack/react-router";
import { AppShell } from "./components/layout/AppShell";
import { ExerciseDetailScreen } from "./screens/ExerciseDetailScreen";
import { ExercisesScreen } from "./screens/ExercisesScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TodayScreen } from "./screens/TodayScreen";

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

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    todayRoute,
    historyRoute,
    exercisesRoute,
    exerciseDetailRoute,
    settingsRoute,
  ]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
