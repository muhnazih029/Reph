---
aliases:
  - Reph Frontend PRD
tags:
  - reph
  - prd
  - frontend
status: draft
updated: 2026-10-29
---

# PRD-FE: Web App (`apps/web`)

**Version:** 0.1-draft (2026-10-29)
**Status:** Draft
**Related:** [PRD](./PRD.md) §3 · [PRD-API](./PRD-API.md) ·
[DESIGN](../guides/DESIGN.md) · [ADR-004](../adr/ADR-004-online-first.md)

---

## 1. Routes

| Route             | Screen         | Purpose                                                     | Phase |
| ----------------- | -------------- | ----------------------------------------------------------- | ----- |
| `/`               | Today          | Start/resume CTA, week summary, recent PRs, recent workouts | 1     |
| `/workout/active` | ActiveWorkout  | Logging surface for the current session                     | 1     |
| `/history`        | History        | Month-grouped list of completed workouts                    | 1     |
| `/workouts/:id`   | WorkoutDetail  | Read view + inline edit + delete                            | 1     |
| `/exercises`      | Exercises      | Library: search, filters, custom creation                   | 1     |
| `/exercises/:id`  | ExerciseDetail | History, 1RM PR, previous performance                       | 1     |
| `/settings`       | Settings       | Units, rest timer, theme, language                          | 1     |
| `/progress`       | Progress       | Photo gallery, add photo, compare view                      | 2     |
| `/routines`       | Routines       | Templates/folders list, start from template                 | 2     |
| `/calendar`       | Calendar       | Month heatmap + streak                                      | 2     |
| `/stats`          | Stats          | Volume/muscle/body-weight dashboards                        | 3     |

Router: TanStack Router (code-based route tree, typed params). The
bottom `TabBar` shows: **Home · Workout · History · Settings** (Phase 2
adds **Progress** as a fifth tab). The `Workout` tab hosts the
`Routines | Exercises` segmented control; the `Exercises` route remains
reachable for deep links.

## 7. Account & auth

- **`/login`** — sign in (email + password) or, when the instance has
  no account yet, "Create your account" (name + email + password). The
  first account becomes the owner and takes the legacy `OWNER_USER_ID`,
  so existing data stays attached.
- The session token (from `/api/v1/auth/login`) is stored in
  `localStorage` (`reph.session`) and sent as `Authorization: Bearer`.
  When absent, the app falls back to the `VITE_REPH_TOKEN` dev token;
  with neither, the app renders the login screen instead of the shell.
- **Account panel** — mobile: avatar (initial) in the Today header opens
  a popover with identity (name + email) and a **Sign out** row (danger
  tint + neutral text). Desktop: the sidebar's bottom chip opens the
  same menu as a dropdown (`Account · Settings · Sign out`).
- **Sign out** calls `POST /api/v1/auth/logout`, clears the token, and
  returns to the login screen.

## 2. Data flow

```text
screens  ──useQuery──▶  api client (typed fetch)  ──HTTP──▶  apps/api
   ▲                        │
   └── invalidate ── mutation hooks (useMutation)
```

- **TanStack Query** owns all server state: keys
  `['exercises']`, `['workouts', cursor]`, `['workout', id]`,
  `['workout-active']`, `['settings']`. Mutations invalidate the
  relevant keys; no manual cache surgery.
- **Zustand** owns two _client_ concerns only:
  - `activeWorkout` — optimistic mirror of the server row while logging
    (every mutation PATCHes the server, then refreshes the mirror);
  - `restTimer` — countdown, audio, vibration (never server state).
- The api client attaches the bearer token, parses the error envelope,
  and throws a typed `ApiError` — screens render a shared error state.

## 3. Screens (MVP acceptance)

### 3.1 Today (`/`)

Greeting + date · primary **Start Workout** (or **Resume** when an active
workout exists) · this-week stat row (workouts / volume / sets) · recent
PRs (≤ 3: exercise, estimated 1RM, date) · recent workouts (≤ 5) · empty
state for first-run.

### 3.2 Active workout (`/workout/active`)

- Sticky header: editable title, elapsed-time ticker, **Finish** button,
  overflow menu (discard with confirm, body-weight input).
- Entry card per exercise: name (tap → last performance popover),
  superset badge + toggle, set rows, **Add set**, collapsible notes,
  overflow (replace exercise, move up/down, delete).
- Set row: `[done ✓] [weight] × [reps] [RPE] [type badge] [menu]`;
  cardio exercises swap in duration / distance / calories fields.
  Inputs are tap-to-edit numerics (`inputMode="decimal"`), commit on
  blur/Enter; weights display per unit setting and convert back to kg.
- Add exercise → bottom sheet picker: search, recent 5, full library
  grouped by muscle group.
- Finishing a set starts the rest timer ([§3.6](#36-rest-timer)).

### 3.3 History & detail

Month-grouped rows (date, title, duration, volume, sets) → detail: stats
strip, entries rendered read-only, inline edit mode reusing set rows,
delete with confirm.

### 3.4 Exercises

Search + muscle-group filter (sticky group headers) → detail: badges
(muscle/equipment), PR card (Epley best + date), history list with best
set highlighted, FAB → create custom exercise (validated form).

### 3.5 Settings

Unit/theme/language segmented controls; rest-timer duration presets
(30/60/90/120/180 s + custom stepper); every change persists via
`PUT /settings` and applies immediately (theme class, `i18n.changeLanguage`).

### 3.6 Rest timer (global)

Floating bar above the tab bar whenever running: `MM:SS` (tabular
numerals), pause/resume, +15 s, cancel. On zero: two-tone 880 Hz beep
(WebAudio) + `navigator.vibrate([200,100,200])` (guarded — iOS ignores
vibration). Default duration from settings.

## 4. Offline & error behavior ([ADR-004](../adr/ADR-004-online-first.md))

- App shell + assets cache via service worker → the UI always _loads_.
- Server data: TanStack Query serves the last-known cache for reads, with
  a persistent **"Offline — data may be stale"** banner (`navigator.onLine`
  - failed-health probe).
- Writes while offline: blocked with an inline explanation (no queued
  writes in v1); the logging screen disables Finish but never loses typed
  input in the mirror store — retry is one tap after reconnect.
- API errors: shared `ErrorState` (message + retry); 401 → "server token
  mismatch" hint pointing at `.env`; 409 conflicts → reload prompt.

## 5. i18n & accessibility

- react-i18next; `en` (default) + `id`; keys namespaced by screen
  (`today.*`, `workout.*`, `settings.*` …). No hardcoded strings —
  enforced by review (grep) in Phase 1 final gate.
- Numbers: `tabular-nums` everywhere weights/times render; locale-aware
  formatting via `Intl`.
- Touch targets ≥ 44 px; visible focus rings; bottom nav respects
  `env(safe-area-inset-bottom)`; contrast AA in both themes
  (see [DESIGN](../guides/DESIGN.md)).

## 6. PWA

- `vite-plugin-pwa`: manifest (name "Reph", theme color, categories,
  shortcut **Log Workout** → `/workout/active`), icons 192/512/maskable,
  `registerType: 'autoUpdate'`.
- Install verified on Android Chrome + iOS Safari (share sheet icon).
- Build target: modern browsers (ES2022); no IE/legacy chunking.
