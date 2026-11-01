---
aliases:
  - Stats
  - Units
  - 1RM
tags:
  - reph
  - feature
status: built
updated: 2026-10-31
---

# Stats primitives (Epley, volume, weekly series) + units

## Purpose

Pure, unit-tested progression math (Epley 1RM, volume, weekly series,
previous performance) plus display-unit converters — the shared
foundation consumed by Tasks 7–11.

## Acceptance criteria

- [x] `estimate1RM(100, 5) ≈ 116.67`; `estimate1RM(w, 1) === w`.
- [x] `bestSetByEpley` picks the max-Epley set, returns null on empty/all-null.
- [x] `workoutVolumeKg` counts only `done` strength sets, excludes warm-ups.
- [x] `weeklyVolumeSeries` buckets by local Monday across N weeks ascending.
- [x] `previousPerformance` returns the most recent done set triple or null.
- [x] Converters exact (2.20462 / 0.621371); `displayWeight(80, "kg") === "80 kg"`; lb variant 1 decimal.

## API

None — client-side pure functions in `src/lib/stats.ts` + `src/lib/units.ts`.

## UI

Consumed by exercise detail PR card, history rows, Today week summary, and
exercise detail sessions list.
