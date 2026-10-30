---
aliases:
  - Reph API PRD
tags:
  - reph
  - prd
  - api
status: draft
updated: 2026-10-29
---

# PRD-API: REST API (`apps/api`)

**Version:** 0.1-draft (2026-10-29)
**Status:** Draft
**Related:** [PRD](./PRD.md) §3 · [contracts](./contracts.md) ·
[db-schema](../data/db-schema.md) · [ADR-003](../adr/ADR-003-postgres-docker.md) ·
[ADR-004](../adr/ADR-004-online-first.md)

---

## 1. Module overview

Hono app served by `Bun.serve`, modular routers under
`apps/api/src/modules/`, shared Zod validation from
`packages/contracts`, Drizzle for persistence.

| Module    | Path prefix         | Responsibility                                 | Phase |
| --------- | ------------------- | ---------------------------------------------- | ----- |
| health    | `/health`           | Liveness + DB ping for compose probes          | 1     |
| exercises | `/api/v1/exercises` | Library listing/search, custom CRUD            | 1     |
| workouts  | `/api/v1/workouts`  | Session CRUD, active workout, finish           | 1     |
| settings  | `/api/v1/settings`  | Per-user preferences (single row)              | 1     |
| photos    | `/api/v1/photos`    | Multipart upload, list, delete (files on disk) | 2     |
| routines  | `/api/v1/routines`  | Templates, folders, programs                   | 2     |
| metrics   | `/api/v1/metrics`   | Body weight / measurements                     | 3     |

## 2. Conventions

- **Base path:** `/api/v1`. Breaking changes bump the prefix.
- **Auth:** `Authorization: Bearer <REPH_API_TOKEN>` (from env). Missing/
  wrong token → `401`. Disabled when the env var is empty (local dev).
  Single-user for now; the token is the seam for real accounts later.
- **Validation:** every request body/query validated with the Zod schema
  from [contracts](./contracts.md). Validation failure → `400` with
  field-level details. DB constraints remain the final authority.
- **Units:** requests and responses always use canonical units
  (kg, meters, seconds, epoch ms for timestamps). Display conversion
  happens in the web app only.
- **Error envelope** (all non-2xx):

```json
{ "error": { "code": "not_found", "message": "Workout not found", "details": {} } }
```

Codes: `bad_request`, `unauthorized`, `not_found`, `conflict`,
`internal`.

- **Pagination:** collection endpoints accept `?limit=` (default 50,
  max 200) and `?before=<epoch_ms>` (cursor on `start_time` for workouts).
  Response: plain array (cursor semantics documented per endpoint; no
  page objects needed at this scale).
- **Concurrency:** last-writer-wins per record, guarded by
  `updated_at` echo (client sends the `updated_at` it loaded; mismatch →
  `409 conflict`). Sufficient for one active user; revisit in Phase 4.

## 3. Endpoint index

Status: ⬜ planned · 🟩 implemented.

### Health

| Method | Path      | Description                                       | Status |
| ------ | --------- | ------------------------------------------------- | ------ |
| GET    | `/health` | `{ status, db: 'up'\|'down', version }` — no auth | ⬜     |

### Exercises

| Method | Path                                           | Description                                              | Status |
| ------ | ---------------------------------------------- | -------------------------------------------------------- | ------ |
| GET    | `/api/v1/exercises?q=&muscleGroup=&equipment=` | List library (global + own), filter/search               | ⬜     |
| POST   | `/api/v1/exercises`                            | Create custom exercise → `201`                           | ⬜     |
| GET    | `/api/v1/exercises/:id`                        | Single exercise                                          | ⬜     |
| PATCH  | `/api/v1/exercises/:id`                        | Edit custom exercise (global library → `409`)            | ⬜     |
| DELETE | `/api/v1/exercises/:id`                        | Delete custom (global → `409`; used by workouts → `409`) | ⬜     |

### Workouts

| Method | Path                              | Description                                                                             | Status |
| ------ | --------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| GET    | `/api/v1/workouts?limit=&before=` | History, desc by `start_time`                                                           | ⬜     |
| GET    | `/api/v1/workouts/active`         | Current `status='active'` workout or `null`                                             | ⬜     |
| POST   | `/api/v1/workouts`                | Create workout (`status='active'`) → `201`; `409` if one is already active              | ⬜     |
| GET    | `/api/v1/workouts/:id`            | Full workout with entries + sets                                                        | ⬜     |
| PATCH  | `/api/v1/workouts/:id`            | Update fields, nested entries/sets (replace-entries semantics), title/notes/body weight | ⬜     |
| POST   | `/api/v1/workouts/:id/finish`     | Set `status='completed'`, `end_time=now()`                                              | ⬜     |
| DELETE | `/api/v1/workouts/:id`            | Delete workout (cascade entries/sets)                                                   | ⬜     |

**Nested write semantics:** `PATCH /workouts/:id` accepts the complete
`entries` array (each with complete `sets`). The server replaces the
child rows for the workout inside one transaction — simple, atomic, and
matches how the client already models the active session. Entry/sets
keep their client-generated UUIDs so idempotent retries are safe.

### Settings

| Method | Path               | Description                                              | Status |
| ------ | ------------------ | -------------------------------------------------------- | ------ |
| GET    | `/api/v1/settings` | Row for current user (defaults seeded on first read)     | ⬜     |
| PUT    | `/api/v1/settings` | Full replace of updatable fields (partial body accepted) | ⬜     |

## 4. Data shapes

Authoritative shapes live in [contracts](./contracts.md). Summary:

- `Exercise` — id, name, muscleGroup, equipment, type, isCustom, userId
- `Workout` — id, userId, title, notes, startTime, endTime, status,
  bodyWeightKg, entries: `WorkoutEntry[]`, createdAt, updatedAt
- `WorkoutEntry` — id, exerciseId, notes, supersetId, position, sets
- `WorkoutSet` — id, type, weightKg, reps, rpe, durationSeconds,
  distanceMeters, calories, done, position
- `Settings` — weightUnit, distanceUnit, restTimerSeconds, theme, language

## 5. Storage decisions

- **Rows** for everything structured; no JSONB blobs for entries/sets —
  they benefit from constraints, indexing, and ad-hoc SQL
  (PR queries: "max weight × reps per exercise per day").
- **Files** (photos, Phase 2) live on the server filesystem under
  `REPH_DATA_DIR/photos/` as content-addressed JPEGs; DB rows hold
  metadata + relative path. See [ADR-005](../adr/ADR-005-self-hosted-stb.md)
  for the storage budget.
- **Active workout** is an ordinary `workouts` row with
  `status='active'` — no separate draft store; resume works after any
  client restart ([PRD](./PRD.md) §3.1).

## 6. Error & validation rules (module-level)

- Unknown exercise in a workout entry → `400 bad_request` (FK would fail
  anyway; validate for a friendly message).
- Finishing an already-finished workout → `409 conflict`.
- Deleting an exercise referenced by any workout → `409 conflict`
  (history is never silently rewritten).
- Oversized photo upload (> 15 MB) → `413`, non-JPEG/PNG → `415` (Phase 2).
