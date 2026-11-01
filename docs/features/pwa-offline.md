---
aliases:
  - PWA
  - Offline
  - Install
tags:
  - reph
  - feature
status: built
updated: 2026-10-31
---

# PWA install + offline banner

## Purpose

Installable PWA (manifest, icons, service worker via vite-plugin-pwa) that
renders the cached shell offline, plus an inline banner on the active
workout screen explaining writes are blocked until connectivity returns.

## Acceptance criteria

- [x] Manifest exposes name, icons, theme color, start_url, standalone.
- [x] Service worker precaches the shell (`index.html`) and `navigateFallback`
      routes, with `/api/` on the denylist so API calls never serve stale.
- [x] The active workout screen shows an inline offline banner and disables
      all inputs while `navigator.onLine` is false (PRD-FE §4).
- [x] Writes resume automatically once connectivity returns.

## API

None — client-only; the API client never caches responses.

## UI

- `vite.config.ts` manifest + workbox block; `src/components/workout/RestTimerBar`
  etc.; `ActiveWorkoutScreen` `useOnlineStatus()` banner.
