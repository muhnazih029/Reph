---
aliases:
  - Workout logging
  - Active workout
  - Logging
tags:
  - reph
  - feature
status: built
updated: 2026-10-31
---

# Workout logging (active session, sets, supersets)

## Purpose

Log a workout against the server in real time: exercises as entries,
sets with weight/reps/RPE and warm-up/drop/failure types, supersets, and
a finish/discard lifecycle — one active workout at a time, restored on
refresh via the server mirror.

## Acceptance criteria

- [x] Given no workout is active, when the player opens the active
      route, then the app bounces home after hydration; with an active
      row, `hydrate()` restores the session and continues it.
- [x] Given an exercise is added, when it lands, then the entry appends
      with `position = n` plus one empty normal set; structure changes
      re-stabilise positions 0..n-1.
- [x] Given sets are edited, when fields commit (blur/Enter or the ✓
      button), then the store PATCHes the full nested payload with
      `expectedUpdatedAt`; a stale write rolls back to server truth.
- [x] Given set edits apply, when `updateSet` runs, then the mirror
      shows the value optimistically and reverts on rejection.
- [x] Given two entries are toggled as a superset, when toggled again,
      both entries share one `supersetId`, then a second toggle clears both.
- [x] Given a previous performance exists, when the exercise header is
      opened, then the popover shows it and "repeat" prefills empty sets.
- [x] Given the workout is finished, when it completes, then status is
      `completed` with `end_time`, the mirror clears, and the row shows up
      in the history query; discard deletes everything.
- [x] Given the device is offline, when the player tries to log, then an
      inline banner explains writes are blocked (PRD-FE §4).

## API

- `GET/POST /api/v1/workouts`, `GET /api/v1/workouts/active`
- `PATCH /api/v1/workouts/:id` (nested full-replace + `expectedUpdatedAt`)
- `POST /api/v1/workouts/:id/finish`, `DELETE /api/v1/workouts/:id`
- `GET /api/v1/workouts?limit=200` (previous performance scan)

See [PRD-API](../specs/PRD-API.md).

## UI

- Route: `/workout/active` (+ redirect guard when nothing is active).
- Components: `ActiveWorkoutScreen`, `EntryCard`, `SetRow`,
  `ExercisePicker` (`{ open, onOpenChange, onSelect(exerciseId) }`,
  reused by Phase 2 templates), `RestTimerBar` (mounted in `AppShell`).
- Store: `src/stores/activeWorkout.ts` (Core Interfaces contract).

## Notes

- The store is the single owner of the in-session workout; the TanStack
  `['workouts']` cache is invalidated after every mutation.
- Manual E2E (start → 2 exercises → warmup+normal → superset → finish →
  history row; refresh mid-workout → hydrate restores) executed against
  the live API on 2026-10-30.
