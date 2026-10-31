---
aliases:
  - Settings
  - Units
  - Theme
  - Language
tags:
  - reph
  - feature
status: built
updated: 2026-10-31
---

# Settings

## Purpose

Single-row server settings (PUT, schema-validated) that immediately
change how the app looks and talks — theme, units, rest-timer default,
and language — plus an About blurb with data-ownership framing.

## Acceptance criteria

- [x] Given the settings screen opens, when controls render, then the
      Appearance, Units, Rest timer, and Language sections mirror the
      server row (skeleton while loading, offline note on error).
- [x] Given any control changes, when the change PUTs, then
      `documentElement.classList` flips dark/light,
      `i18n.changeLanguage` re-renders every screen, and the rest-timer
      store picks the new default on its next `start()`.
- [x] Given rest-timer presets (30/60/90/120/180), when a preset or the
      15-second stepper is used, then the seconds setting updates in one
      PUT.
- [x] Given About, when rendered, then the app version (Vite-injected
      `REPH_VERSION`) and the self-hosted data-ownership note show.

## API

- `GET /api/v1/settings`, `PUT /api/v1/settings`
  (see [PRD-API](../specs/PRD-API.md)).

## UI

- Route: `/settings`.
- Components: `SettingsScreen` (`SegmentedControl`, rest-timer preset
  chips + `NumberStepper`); `lib/preferences.ts → applyPreferences()`
  applies theme class + language, called from the screen effect AND once
  on boot from `main.tsx` (`fetchSettings` + query cache).

## Notes

- Weight/distance units are display-only: storage stays canonical
  (kg / meters) and conversion happens only in the web layer.
- Theme enum is currently `dark`/`light` (no `system` — Core Interfaces
  keeps the option open).
