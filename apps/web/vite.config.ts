import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tailwind v4 + vite-plugin-pwa + /api proxy arrive in Phase 1 Task 5.
export default defineConfig({
  plugins: [react()],
});
