---
aliases:
  - Phase 2 Photos Routines Plan
tags:
  - reph
  - plan
status: draft
updated: 2026-11-01
---

# Phase 2 — Progress Photos, Routines/Templates & Calendar/Streak

> **For agentic workers:** implement task-by-task in order. Steps use
> checkbox syntax for tracking. Every task ends green
> (`bun run typecheck && bun test && bun run lint`) and committed
> (conventional commits).

**Goal:** add the three Phase-2 capability groups from the PRD roadmap —
routines/templates (reusable workout blueprints + folders), progress
photos with before/after comparison, and a calendar/streak view — on top
of the Phase-1 architecture (Hono + Drizzle + Postgres, React PWA,
TanStack Query, shared Zod contracts).

**Architecture:** Each subsystem is independent and ships on its own. New
tables follow the Phase-1 conventions (`uuid` PKs, `user_id` nullable for
future multi-user, epoch-ms timestamps, `ON DELETE CASCADE` for children).
New API modules follow the `module({ db })` factory pattern; new web
screens follow the TanStack Router code-based tree + `AppShell` outlet.
All strings go through `react-i18next` (en + id).

**Tech Stack:** Bun 1.4 · Hono · Drizzle + PostgreSQL 16 (PGlite tests) ·
Zod · React 19 + Vite + TanStack Router/Query · Tailwind v4 ·
react-i18next (en/id) · oxlint + oxfmt · `bun test`

## Scope Check

Phase 2 covers three independent subsystems. They are written here as one
plan but grouped into three independent tracks (A/B/C) so a reviewer can
approve/reject one track without affecting the others. If execution feels
too large, split into three plans:
- `phase-2a-routines.md`
- `phase-2b-photos.md`
- `phase-2c-calendar.md`

## File Structure (end state of Phase 2)

```
packages/contracts/src/
  routines.ts              (new) routine/routineEntry/routineSet/routineFolder schemas
  photos.ts                (new) progressPhoto schema + requests
  stats.ts                 (new) calendar/streak response schemas

apps/api/src/db/
  schema.ts                (modify) + routines, routine_entries, routine_sets,
                               routine_folders, progress_photos

apps/api/src/modules/
  routines.ts              (new)
  photos.ts                (new)
  stats.ts                 (modify) + calendar + streak endpoints

apps/web/src/screens/
  RoutinesScreen.tsx       (new)
  RoutineEditorScreen.tsx  (new)
  PhotosScreen.tsx         (new)
  PhotoCompareScreen.tsx   (new)
  CalendarScreen.tsx       (new)

apps/web/src/components/
  routine/                 (new) RoutineCard, RoutineEntryEditor
  photo/                   (new) PhotoGrid, PhotoCompare
  calendar/                (new) MonthGrid, DayCell, StreakBadge
```

## Core Interfaces (Phase 2)

- **Routine** = reusable blueprint. `POST /routines/:id/start` creates a
  `workout` (status=active) copying entries+sets, returns the workout.
- **Progress photo** stored as `bytea` in Postgres, served via
  `GET /photos/:id/image` (binary) with `Content-Type`.
- **Calendar** derived from `workouts` (status=completed), grouped by
  local day; streak = consecutive days with ≥1 completed workout.

---

# Track A — Routines / Templates

### Task A1: DB schema for routines, folders, entries, sets

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/migrations/*` (via `db:generate`)

- [ ] **Step 1: Add pgTable definitions**

```ts
export const routineFolders = pgTable("routine_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routines = pgTable("routines", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  folderId: uuid("folder_id").references(() => routineFolders.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routineEntries = pgTable("routine_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  routineId: uuid("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  position: integer("position").notNull().default(0),
  notes: text("notes").notNull().default(""),
  supersetId: uuid("superset_id"),
});

export const routineSets = pgTable("routine_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  routineEntryId: uuid("routine_entry_id").notNull().references(() => routineEntries.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  type: setType("type").notNull().default("normal"),
  reps: integer("reps"),
  weightKg: numeric("weight_kg", { precision: 8, scale: 3 }),
  durationSeconds: integer("duration_seconds"),
  distanceMeters: integer("distance_meters"),
  rpe: numeric("rpe", { precision: 3, scale: 1 }),
});
```

- [ ] **Step 2: Generate migration**

Run: `bun run db:generate`
Expected: new migration file created under `apps/api/src/db/migrations/`.

- [ ] **Step 3: Apply + verify**

Run: `bun run db:migrate`
Expected: tables exist (`\dt` in psql).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/migrations
git commit -m "feat(api): routines, folders, entries, sets schema"
```

### Task A2: Contracts for routines

**Files:**
- Create: `packages/contracts/src/routines.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: Write schemas**

```ts
import { z } from "zod";
import { exerciseTypeSchema, setTypeSchema, uuidSchema } from "./enums";

export const routineSetSchema = z.object({
  id: uuidSchema,
  position: z.number().int().nonnegative(),
  type: setTypeSchema,
  reps: z.number().int().nonnegative().nullable(),
  weightKg: z.number().nonnegative().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  distanceMeters: z.number().int().nonnegative().nullable(),
  rpe: z.number().min(0).max(10).nullable(),
});

export const routineEntrySchema = z.object({
  id: uuidSchema,
  exerciseId: uuidSchema,
  position: z.number().int().nonnegative(),
  notes: z.string(),
  supersetId: uuidSchema.nullable(),
  sets: z.array(routineSetSchema),
});

export const routineSchema = z.object({
  id: uuidSchema,
  userId: z.string().nullable(),
  folderId: uuidSchema.nullable(),
  name: z.string().min(1),
  description: z.string().nullable(),
  position: z.number().int().nonnegative(),
  entries: z.array(routineEntrySchema),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const routineFolderSchema = z.object({
  id: uuidSchema,
  userId: z.string().nullable(),
  name: z.string().min(1),
  position: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
});

export const createRoutineRequestSchema = routineSchema
  .pick({ name: true, description: true, folderId: true, entries: true })
  .partial({ description: true, folderId: true, entries: true });

export const updateRoutineRequestSchema = createRoutineRequestSchema
  .extend({ expectedUpdatedAt: z.number().int().nonnegative() })
  .partial({ name: true, description: true, folderId: true, entries: true });
```

- [ ] **Step 2: Export from index**

```ts
export * from "./routines";
```

- [ ] **Step 3: Add contract tests**

Mirror `packages/contracts/src/entities.test.ts` style: valid fixture + rejection cases (empty name, rpe>10, missing expectedUpdatedAt on update).

- [ ] **Step 4: Typecheck + test**

Run: `bun run typecheck && bun test`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/routines.ts packages/contracts/src/index.ts packages/contracts/src/routines.test.ts
git commit -m "feat(contracts): routine, folder, entry, set schemas"
```

### Task A3: API module for routines

**Files:**
- Create: `apps/api/src/modules/routines.ts`
- Modify: `apps/api/src/app.ts` (register module under `/api/v1/routines`)
- Create: `apps/api/src/modules/routines.test.ts`

Endpoints:
- `GET /routines` (optional `?folderId=`)
- `GET /routines/:id`
- `POST /routines`
- `PATCH /routines/:id` (expectedUpdatedAt, full nested replace of entries/sets)
- `DELETE /routines/:id` (cascade)
- `POST /routines/:id/start` → creates workout (status active) from routine, returns workout
- `GET /routine-folders`, `POST /routine-folders`, `PATCH /routine-folders/:id`, `DELETE /routine-folders/:id`

- [ ] **Step 1: Write failing tests** (list/create/get/update/delete/start/folder) following `workouts.test.ts` patterns.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement module** using `db.transaction` for nested writes; `start` copies entries+sets into a new workout with `startTime = now`.
- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `feat(api): routines CRUD + start-from-routine`.

### Task A4: Web — Routines screen + editor

**Files:**
- Create: `apps/web/src/screens/RoutinesScreen.tsx`
- Create: `apps/web/src/screens/RoutineEditorScreen.tsx`
- Modify: `apps/web/src/router.tsx` (add `/routines`, `/routines/$id`)
- Modify: `apps/web/src/api/hooks.ts` (add useRoutines, useRoutine, mutations)
- Modify: `apps/web/src/components/layout/TabBar.tsx` (optional 5th tab or keep under Today menu)

- [ ] Implement list grouped by folder, create/edit/delete, "Start" button → navigates to `/workout/active` with the new workout.
- [ ] Add i18n keys (en + id).
- [ ] Commit `feat(web): routines list + editor + start`.

### Task A5: Track A release gate

Run full gate; commit `chore: track A (routines) release gate`.

---

# Track B — Progress Photos

### Task B1: DB schema for progress photos

**Files:**
- Modify: `apps/api/src/db/schema.ts`

```ts
export const progressPhotos = pgTable("progress_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  mimeType: text("mime_type").notNull(),
  data: bytea("data").notNull(),
  weightKg: numeric("weight_kg", { precision: 8, scale: 3 }),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] Generate + migrate + commit.

### Task B2: Contracts

**Files:** `packages/contracts/src/photos.ts`

- `progressPhotoSchema` (id, userId, takenAt, weightKg, notes, mimeType, createdAt) — no `data`.
- `createProgressPhotoRequestSchema` (multipart fields: weightKg?, notes?, takenAt?).
- Export + tests.

### Task B3: API module

Endpoints:
- `GET /photos` (list metadata, paginated by `before` takenAt)
- `POST /photos` (multipart upload, max 5 MB, image/* only)
- `GET /photos/:id/image` (binary stream)
- `PATCH /photos/:id` (notes, weightKg, takenAt)
- `DELETE /photos/:id`

- [ ] Tests + impl + commit.

### Task B4: Web — Photos screen + compare

**Files:**
- `PhotosScreen.tsx` (grid timeline, upload via `<input type="file" accept="image/*">` + camera capture on mobile)
- `PhotoCompareScreen.tsx` (two photos side-by-side with date/weight labels)
- hooks: usePhotos, useUploadPhoto, useDeletePhoto
- i18n keys

- [ ] Commit `feat(web): progress photos grid + compare`.

### Task B5: Track B release gate

---

# Track C — Calendar & Streak

### Task C1: Stats endpoints

**Files:**
- Modify: `apps/api/src/modules/stats.ts` (or create)

Endpoints:
- `GET /stats/calendar?year=&month=` → `{ days: [{ date: "YYYY-MM-DD", count: number }] }`
- `GET /stats/streak` → `{ current: number, longest: number }`

Derived from `workouts` where `status='completed'`, grouped by `date_trunc('day', end_time)`.

- [ ] Contracts in `packages/contracts/src/stats.ts`.
- [ ] Tests + impl + commit.

### Task C2: Web — Calendar screen

**Files:**
- `CalendarScreen.tsx` (month grid, heatmap intensity by count, tap day → list workouts)
- `StreakBadge` component on TodayScreen
- Route `/calendar`
- i18n keys

- [ ] Commit `feat(web): calendar heatmap + streak badge`.

### Task C3: Track C release gate

---

# Phase 2 Release Gate

- [ ] `bun run typecheck && bun test && bun run lint && bun run format:check && bun run build`
- [ ] Manual checklist:
  - Create routine from existing workout → start workout from routine → entries copied
  - Folder CRUD
  - Upload photo (mobile camera + desktop file), view grid, compare two
  - Calendar shows completed workouts; streak increments
  - en + id both complete
- [ ] Commit `chore: phase 2 release gate`
- [ ] Update `docs/features/*.md` status to `built` for new features
- [ ] Update `docs/plans/phase-1-mvp.md` "After Phase 1" note → Phase 2 in progress

## After Phase 2
Next: Phase 3 (body metrics + trend, stats dashboard, year in review, CSV import/export) — `docs/plans/phase-3-analytics.md`.
STB deploy still pending (can be done any time after Phase 2 gate green).
