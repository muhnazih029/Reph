import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { registerSW } from "virtual:pwa-register";
import { queryClient } from "./api/queryClient";
import { useActiveWorkoutStore } from "./stores/activeWorkout";
import { applyPreferences } from "./lib/preferences";
import { router } from "./router";
import "./i18n";
import "./app.css";

registerSW({ immediate: true });
void useActiveWorkoutStore.getState().hydrate(); // mirror the server's active row on boot

// apply the cached theme class + app language as soon as the settings row
// arrives (docs/plans/phase-1-mvp.md Task 11); the settings screen keeps
// them fresh afterwards via applyPreferences on each change
void import("./api/hooks").then(
  ({ fetchSettings }) =>
    queryClient
      .fetchQuery({ queryKey: ["settings"], queryFn: fetchSettings })
      .then((settings) => applyPreferences(settings))
      .catch(() => undefined), // keep the light default until a row exists
);

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
