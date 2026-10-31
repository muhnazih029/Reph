---
aliases:
  - History
  - Workout detail
  - Past workouts
tags:
  - reph
  - feature
status: built
updated: 2026-10-31
---

# History & workout detail (edit, delete)

## Purpose

Browse completed workouts grouped by month, open one as a read-only
report (duration, volume, sets, reps per exercise), fix mistakes through
an inline edit draft, or delete the workout entirely.

## Acceptance criteria

- [x] Given workouts exist, when the history screen opens, then only
      `status === "completed"` rows appear, grouped by month
      (`LLLL yyyy`, most-recent month first) with per-row date, set
      count, volume, and duration; rows link to the detail route.
- [x] Given no workouts exist, when the screen opens, then an empty
      state with a start-workout CTA shows; loading shows skeletons and
      failures show a retry-able error state.
- [x] Given a workout detail is open, when rendered read-only, then a
      stats strip (duration / volume / sets / reps) appears above
      read-only EntryCards (sets as `80 kg × 5 @ 8 RPE`, notes visible).
- [x] Given Edit is pressed, when sets are patched, then edits collect
      in a local draft and are sent as ONE nested PATCH with
      `expectedUpdatedAt`; a 409 conflict surfaces a reload prompt as
      required by the store contract (no blind overwrite).
- [x] Given Delete is confirmed, when the mutation resolves, then the
      workout is removed and the app navigates back to history.

## API

- `GET /api/v1/workouts?limit=200` (history list, previous scans)
- `GET /api/v1/workouts/:id` (detail)
- `PATCH /api/v1/workouts/:id` (nested full-replace + `expectedUpdatedAt`)
- `DELETE /api/v1/workouts/:id`

See [PRD-API](../specs/PRD-API.md).

## UI

- Routes: `/` tab → history list; `/workouts/$id` detail.
- Components: `HistoryScreen` (month grouping via `date-fns` format),
  `WorkoutDetailScreen` (local edit draft + conflict prompt),
  `EntryCard`/`SetRow` gained `readOnly` and `onSetPatch`/`onRemoveSet`
  edit-passthrough modes (live active-workout mode unchanged).

## Notes

- The edit draft is deliberately client-serialised: every keystroke
  stays local, Save issues a single transaction-style PATCH, matching
  the Core Interfaces store contract.
- Month grouping is locale-formatted through date-fns so en/id users
  see their own month names.
