import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { registerSW } from "virtual:pwa-register";
import { queryClient } from "./api/queryClient";
import { useActiveWorkoutStore } from "./stores/activeWorkout";
import { router } from "./router";
import "./i18n";
import "./app.css";

registerSW({ immediate: true });
void useActiveWorkoutStore.getState().hydrate(); // mirror the server's active row on boot

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
