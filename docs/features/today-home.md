---
aliases:
  - Today
  - Home
  - Start workout
tags:
  - reph
  - feature
status: built
updated: 2026-10-31
---

# Today home

## Purpose

The launch screen: one glance at greeting/date, the primary Start (or
Resume) action, this-week training load, recent personal records, and
the newest workouts.

## Acceptance criteria

- [x] Given no workout is active, when Start is pressed, then a workout
      is created (`useCreateWorkout`) and the app navigates to
      `/workout/active`; with an active row the button reads Resume and
      navigates directly without creating a second row.
- [x] Given completed workouts exist, when the screen renders, then the
      week strip shows this local week's workouts count, volume
      (`weeklyVolumeSeries(completed, 1)`), and done-set count.
- [x] Given PRs exist among the last 20 completed workouts, when
      rendered, then up to three records show (best Epley set per
      exercise via `bestSetByEpley`, displayed through `displayWeight`),
      plus up to five recent workouts reusing the history `WorkoutRow`.
- [x] Given a fresh account, when the screen renders, then a first-run
      empty state explains what will appear here.

## API

- `GET /api/v1/workouts?limit=20` (week + PR + recent scans)
- `GET /api/v1/workouts/active` (resume CTA)
- `POST /api/v1/workouts` (start)
- `GET /api/v1/exercises` (PR names), `GET /api/v1/settings` (units)

See [PRD-API](../specs/PRD-API.md).

## UI

- Route: `/` (Today tab).
- Components: `TodayScreen`, shared `components/history/WorkoutRow.tsx`
  (also used by `HistoryScreen` so the two lists never drift).

## Notes

- Week bucketing is local-time Monday-start, identically to the stats
  library used by Task 6 so Today and any future stats screen agree.
