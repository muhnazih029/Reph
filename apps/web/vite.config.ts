import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// PWA manifest per docs/specs/PRD-FE.md §6; dev proxy /api → apps/api.
// Ports come from the root .env (WEB_PORT / PORT) so the documented
// http://localhost:3000 stays true — Vite's own default is 5173.
const webPort = Number(process.env.WEB_PORT ?? 3000);
const apiPort = Number(process.env.PORT ?? 3001);

export default defineConfig({
  define: {
    REPH_VERSION: JSON.stringify("0.1.0"),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      devOptions: { enabled: true },
      manifest: {
        name: "Reph",
        short_name: "Reph",
        description: "Self-hosted workout tracker — your data, your server.",
        lang: "en",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        categories: ["health", "fitness"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [{ name: "Log Workout", short_name: "Log", url: "/workout/active" }],
      },
      workbox: {
        navigateFallback: "/",
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    // strictPort: a busy 3000 should fail loudly, not silently move to 5174.
    port: webPort,
    strictPort: true,
    proxy: { "/api": `http://localhost:${apiPort}` },
  },
  preview: {
    port: webPort,
    strictPort: true,
  },
});
