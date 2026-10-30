---
aliases:
  - Exercise library
  - Library
tags:
  - reph
  - feature
status: built
updated: 2026-10-30
---

# Exercise library + custom exercises

## Purpose

Browse the seeded global library (154 exercises) and the user's own
custom exercises, with debounce search and muscle-group filtering, so a
player can find any exercise quickly during or between sessions.

## Acceptance criteria

- [x] Given the library loads, when the list is rendered, then exercises
      are grouped under sticky muscle-group headers.
- [x] Given the user types in the search field, when 200 ms pass without
      further input, then the query is sent to the API as `q`.
- [x] Given a muscle group is picked from the bottom sheet, when the list
      re-fetches, then only that group's exercises remain and the active
      filter chip shows with a way to clear it.
- [x] Given loading, when data is in flight, then skeletons match the
      final layout (no spinners); on failure, retry is offered.
- [x] Given the FAB is tapped, when the name is empty, then submit is
      disabled with a validation message; when valid, the exercise is
      created server-side and appears in list/detail immediately.
- [x] Given an exercise detail route, when opened, then badges (muscle
      group, equipment, type, custom), the best-set Epley PR card with
      date, the "last performed" line, and the per-session history (best
      set highlighted) render.

## API

- `GET /api/v1/exercises?q=&muscleGroup=`
- `POST /api/v1/exercises`
- `GET /api/v1/exercises/:id`
- `GET /api/v1/workouts?limit=200` (PR + history scan)

See [PRD-API](../specs/PRD-API.md).

## UI

- Routes: `/exercises`, `/exercises/$id`.
- Components: `ExerciseListItem`, create/filter `Sheet`s, shared UI kit.
- See [PRD-FE](../specs/PRD-FE.md).

## Notes

- `ExercisePicker` (session insertion) is deliberately not part of this
  feature; it lands with workout logging (Task 9).
- All weights render through `displayWeight` with the user's unit setting.
