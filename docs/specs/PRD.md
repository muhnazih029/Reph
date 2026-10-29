---
aliases:
  - Reph Product PRD
tags:
  - reph
  - prd
status: draft
updated: 2026-10-29
---
# PRD: Reph — Self-Hosted Workout Tracker

**Version:** 0.1-draft (2026-10-29)
**App Version:** 0.x pre-release — `1.0.0` at first stable release (PRD draft version is independent of app semver)
**Status:** Draft
**Owner:** repo owner
**Last updated:** 2026-10-29

---

## 0. Product Name: Reph

**Reph** derives from *"reps"* — the repetitions that are the fundamental
unit of resistance training. Every set in the app is a rep counted, and the
name keeps the product visibly tied to what it actually measures.

### 0.1 Background

Reph is a personal workout tracker that the owner runs on their own
hardware. It replaces ad-hoc notes (paper, spreadsheets, chat messages to
oneself) with a structured record of every training session, and turns that
record into progression insight: PRs, volume trends, and photo evidence of
physical change over time.

### 0.2 Rationale

- **Data ownership.** Training history is long-term personal data
  (years of sessions). Self-hosting it in PostgreSQL keeps the owner in
  control of the full record, with no third-party account involved.
- **Fit for one person, ready for more.** The product is designed for a
  single primary user, but the schema and API already carry `user_id`, so
  accounts can be added later without rework.
- **Honest complexity.** A structured domain (workouts → entries → sets,
  routines, programs, metrics, photos) benefits from a real database and a
  real API rather than client-side storage — see [ADR-003](../adr/ADR-003-postgres-docker.md)
  and [ADR-004](../adr/ADR-004-online-first.md).

---

## 1. Overview

Reph is a **mobile-first PWA** backed by a **self-hosted REST API**. The
owner opens the web app on their phone (installed to home screen), logs a
workout while training, and reviews progress on any device that can reach
the server.

Core objects (DB: see [db-schema](../data/db-schema.md)):

- **Workout** (DB: `workouts`) — one training session: title, notes,
  start/end time, optional body weight. Holds ordered **entries**
  (DB: `workout_entries`), each referencing one **exercise** and holding
  ordered **sets** (DB: `workout_sets`) — weight (kg), reps, RPE, set type
  (normal / warm-up / drop / failure), or cardio fields (duration,
  distance, calories).
- **Exercise** (DB: `exercises`) — library entry with muscle group,
  equipment, and type (`strength` | `cardio`). A seeded global library plus
  user-created custom exercises.
- **Progress photo** (DB: `photos`, Phase 2) — a dated, private image with
  optional note and body-area tag; stored on the server filesystem.

### 1.1 Problem statement

Training without a tracker loses the two things that make training
progressive: an accurate record of what was lifted last time, and a
coherent view of whether the trend is going up. Notes scattered across
paper and phones make "what did I do for bench press 3 weeks ago?" a guess,
and physical change is invisible week to week unless it is photographed and
compared deliberately.

### 1.2 Goals

- Log a complete workout from a phone in the gym: add exercises, enter
  sets with weight/reps/RPE, rest between sets with a timer, finish — in
  under a minute of overhead per exercise.
- Make last session's numbers visible while logging, so progression is
  always in view.
- Answer "how am I doing?" — PRs (1RM estimates), weekly volume, workout
  streaks, body-weight trend, before/after photo comparison.
- Keep all data self-hosted and private, with a clean path to syncing
  across devices (the server *is* the sync).
- Stay maintainable by one person: small surface area, typed contracts,
  documented decisions.

### 1.3 Non-functional requirements

| Area | Requirement |
|------|-------------|
| Performance | Logging interactions feel instant on a mid-range phone; API p95 < 100 ms on LAN for typical queries. |
| Availability | While the server is unreachable the app shows a clear, non-destructive offline state ([ADR-004](../adr/ADR-004-online-first.md)). |
| Device support | Installable PWA; usable at 360 px width; iOS Safari + Android Chrome first. |
| i18n | English (default) and Indonesian; no hardcoded user-facing strings. |
| Units | Stored canonically in **kg / meters / seconds**; display conversion to lb / mi via settings. |
| Theme | Dark-first with light theme; both meet WCAG AA contrast for text. |
| Data integrity | All writes validated by shared Zod contracts; DB constraints back them up; soft rules (cascade deletes) documented in [db-schema](../data/db-schema.md). |
| Portability | Runs from a fresh clone with Bun + Docker: `bun install && bun run dev`. |

---

## 2. Users

| Persona | Description |
|---------|-------------|
| **Owner (primary)** | One person training several times per week, logging on a phone in the gym, reviewing on laptop. The entire v1 scope. |
| **Future accounts** | Additional users are *not* in v1 scope, but every table carries `user_id` and the API authenticates via bearer token, so multi-user support is a schema- and auth-layer addition, not a redesign. |

---

## 3. Feature set

Status legend: 🟦 planned · 🟨 in progress · 🟩 built · ⬜ later phase.
(Acceptance details live in [features/](../features/README.md) as they are built.)

### 3.1 Workout logging (MVP)

- Start a workout (optional title); the **active workout** persists
  server-side, so a closed tab or phone restart resumes exactly where it
  was.
- Add exercises from the library; per exercise: sets with
  **weight × reps × RPE**, set types (**normal, warm-up, drop, failure**),
  per-set done toggle, reorder, delete.
- **Supersets** — link two entries so they alternate.
- Per-entry notes and per-workout notes; optional body-weight entry.
- **Rest timer** — global countdown with sound + vibration, default
  duration from settings, +15 s / pause / cancel controls, auto-starts
  when a set is marked done.
- Finish workout (end time recorded) or discard with confirmation.
- **Previous-performance hints** — while logging, show what was performed
  last time for that exercise.

### 3.2 Exercise library (MVP)

- Seeded library (120+ exercises across all muscle groups, with equipment
  and type), searchable and filterable by muscle group / equipment.
- Custom exercise creation (name, muscle group, equipment, type).
- Exercise detail: per-exercise history from past workouts, best 1RM
  (Epley estimate) with date, most recent performance.

### 3.3 History & statistics (MVP)

- History list grouped by month: date, title, duration, volume, set count.
- Workout detail: full read-only view + inline edit + delete.
- Home: this-week summary (workouts, volume, sets), recent PRs, recent
  workouts, start/resume CTA.
- Stats primitives: Epley 1RM, workout volume (done strength sets,
  warm-ups excluded), weekly volume series.

### 3.4 Settings (MVP)

- Weight unit (kg/lb), distance unit (km/mi) — display conversion only.
- Rest-timer default duration; theme (dark/light); language (en/id).

### 3.5 Progress photos (Phase 2 — user priority)

- Capture via camera or pick from gallery; client-side downscale
  (max edge 1600 px) and thumbnail generation before upload.
- Private by design: list visible only inside the owner's app; stored on
  the server filesystem (not in the database), referenced by DB rows with
  date, note, optional body-area tag.
- Gallery grouped by month; detail view; delete.
- **Compare** any two photos side-by-side / slider (before–after).

### 3.6 Routines, templates & calendar (Phase 2)

- Routine/template CRUD (planned exercises + sets), folders, start
  workout from template, repeat last workout.
- Calendar view (month heatmap of workouts + rest days), weekly streak
  counter.
- Program tracking: ordered templates per week with completion state.

### 3.7 Body metrics & insights (Phase 3)

- Body-weight and body-measurement log with trend charts and optional
  weight goal.
- Stats dashboard: weekly volume chart, muscle-group distribution,
  body-weight trend.
- Year in Review — annual summary of training volume, PRs, streaks.
- CSV import/export for data portability.

### 3.8 Accounts & multi-user (Phase 4 — conditional)

Only if actually needed: user accounts, per-user auth, sharing rules.
Not designed now beyond `user_id` columns and bearer-token auth.

---

## 4. Roadmap

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **1 — MVP** ([plan](../plans/phase-1-mvp.md)) | §3.1–§3.4: logging, library, history, stats, settings, PWA install | Owner logs a real workout end-to-end on a phone; tests + typecheck green |
| **2 — Photos & routines** | §3.5, §3.6 | Photo compare usable; workout starts from a template |
| **3 — Metrics & insights** | §3.7 | Trend charts + CSV round-trip |
| **4 — Accounts** | §3.8, only if needed | — |

---

## 5. Scope boundaries

v1 scope is defined positively by §3.1–§3.4. Deliberately *not* part of
the product direction: multi-tenant SaaS concerns (billing, quotas),
public/community surfaces, and native mobile apps (the PWA is the client).
The roadmap above is the complete intent; anything not listed is out
until revisited.
