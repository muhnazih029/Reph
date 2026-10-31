---
aliases:
  - Rest timer
  - Timer
tags:
  - reph
  - feature
status: built
updated: 2026-10-31
---

# Rest timer

## Purpose

Count down the rest between sets with a compact bar above the tab bar;
beeps and vibrates at zero so the player knows when to continue without
watching the screen.

## Acceptance criteria

- [x] Given a set is done, when "+ Add set" is pressed, then the timer
      starts with the cached `restTimerSeconds` setting (or a passed
      total) and decrements once per second.
- [x] Given the timer runs, when paused/resumed, then the remaining
      seconds persist across the pause.
- [x] Given the timer hits zero, when it stops, then `isRunning` is
      false, one WebAudio beep fires, and `navigator.vibrate` is called
      once when supported (both best-effort, never throwing).
- [x] Given +15 s is pressed, when time is added, then the remaining
      seconds grow; negative additions clamp at zero.
- [x] Given the bar is rendered, when no rest is pending, then nothing
      occupies the screen (hidden until needed).

## API

None — client-only. Default duration reads the settings cache from
`GET /api/v1/settings` (see [PRD-API](../specs/PRD-API.md)).

## UI

- Component: `src/components/workout/RestTimerBar.tsx`, mounted in
  `AppShell`.
- Store: `src/stores/restTimer.ts` (Core Interfaces contract): start /
  pause / resume / cancel / addSeconds.

## Notes

- Interval-based ticking re-validated in `restTimer.test.ts` with short
  real intervals; WebAudio/vibrate are mocked in the beep test.
