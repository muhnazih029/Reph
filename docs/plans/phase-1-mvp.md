---
aliases:
  - Phase 1 MVP Plan
tags:
  - reph
  - plan
status: draft
updated: 2026-10-29
---

# Phase 1 — MVP Implementation Plan

> **For agentic workers:** implement task-by-task in order. Steps use
> checkbox syntax for tracking. Every task ends green
> (`bun run typecheck && bun test && bun run lint`) and committed
> (conventional commits).

**Goal:** ship the complete MVP defined in [PRD §3.1–§3.4](../specs/PRD.md) —
workout logging with rest timer, exercise library, history, stats, settings,
installable PWA — on the architecture fixed by
[ADR-001…005](../adr/).

**Architecture:** Bun-workspaces monorepo. Hono API validates requests
with shared Zod [contracts](../specs/contracts.md) and persists via
Drizzle to PostgreSQL 16 (Docker); the active workout lives server-side.
React PWA reads/writes exclusively through TanStack Query over the typed
API client; zustand mirrors the active session and owns the rest timer.

**Tech Stack:** Bun 1.4 · Hono · Drizzle + PostgreSQL 16 (PGlite for
tests) · Zod · React 19 + Vite + TanStack Router/Query · Tailwind v4 ·
react-i18next (en/id) · vite-plugin-pwa · oxlint + oxfmt · `bun test`

## Global Constraints

- TypeScript strict; no `any` in exported signatures.
- Canonical storage units: **kg / meters / seconds / epoch-ms**. Display
  conversion (lb/mi) happens only in the web app, driven by settings.
- UI language: English default, every key also translated to `id`.
  No hardcoded user-facing strings.
- Online-first ([ADR-004](../adr/ADR-004-online-first.md)): no feature
  may require network beyond the configured API; offline states follow
  [PRD-FE §4](../specs/PRD-FE.md).
- Dark theme default; tokens from [DESIGN §2](../guides/DESIGN.md).
- Scope: [PRD §3.1–§3.4](../specs/PRD.md) only — nothing beyond it is
  built in this plan.
- Docs stay truthful: `docs/data/db-schema.md` and
  `docs/features/README.md` update in the same commit as the code they
  describe; endpoint statuses in [PRD-API §3](../specs/PRD-API.md) flip
  to 🟩 when implemented.

---

## File Structure (end state of Phase 1)

```text
.
├── package.json                  # workspaces + root scripts
├── bunfig.toml                   # test preload (happy-dom for web)
├── tsconfig.base.json
├── docker-compose.yml            # postgres:16-alpine + volume
├── .env.example                  # DATABASE_URL, REPH_API_TOKEN, PORT
├── .oxlintrc.json / .oxfmtrc.json
├── apps/
│   ├── api/
│   │   ├── package.json          # scripts: dev, test, typecheck, db:*
│   │   ├── src/
│   │   │   ├── index.ts          # Bun.serve(createApp({ db }))
│   │   │   ├── app.ts            # createApp(deps) — Hono + routes + error handler
│   │   │   ├── env.ts            # zod-parsed env
│   │   │   ├── db/
│   │   │   │   ├── schema.ts     # drizzle tables + pgEnums
│   │   │   │   ├── client.ts     # Pool + drizzle
│   │   │   │   ├── migrate.ts    # drizzle migrator entry
│   │   │   │   └── seed.ts       # exercise library (idempotent)
│   │   │   ├── lib/
│   │   │   │   ├── errors.ts     # ApiError(code, status, message) + helper
│   │   │   │   ├── auth.ts       # bearer middleware
│   │   │   │   └── pagination.ts # limit/before parsing
│   │   │   ├── modules/
│   │   │   │   ├── health.ts
│   │   │   │   ├── exercises.ts
│   │   │   │   ├── workouts.ts
│   │   │   │   └── settings.ts
│   │   │   └── **/*.test.ts      # co-located, PGlite-backed
│   │   └── drizzle/              # generated migrations
│   └── web/
│       ├── package.json          # scripts: dev, build, test, typecheck
│       ├── vite.config.ts        # react + tailwind + PWA
│       └── src/
│           ├── main.tsx
│           ├── router.tsx        # typed route tree
│           ├── app.css           # tokens (@theme), base
│           ├── api/
│           │   ├── client.ts     # apiGet/apiSend + ApiError
│           │   └── hooks.ts      # use* query/mutation hooks
│           ├── stores/
│           │   ├── activeWorkout.ts
│           │   └── restTimer.ts
│           ├── lib/
│           │   ├── stats.ts      # estimate1RM, workoutVolumeKg, weeklyVolumeSeries, previousPerformance
│           │   ├── units.ts      # kg<->lb, km<->mi, displayWeight
│           │   └── id.ts         # newId() (crypto.randomUUID)
│           ├── i18n/             # index.ts, en.json, id.json
│           ├── components/
│           │   ├── layout/       # AppShell, TabBar
│           │   ├── ui/           # Button, Input, Sheet, SegmentedControl, NumberStepper, Card, EmptyState, ErrorState, Skeleton
│           │   ├── workout/      # SetRow, EntryCard, ExercisePicker, RestTimerBar
│           │   └── exercise/     # ExerciseListItem
│           └── screens/          # Today, ActiveWorkout, History, WorkoutDetail, Exercises, ExerciseDetail, Settings
├── packages/
│   └── contracts/
│       ├── package.json
│       └── src/
│           ├── index.ts          # re-exports
│           ├── enums.ts
│           ├── entities.ts
│           ├── requests.ts
│           └── errors.ts
└── docs/                         # maintained alongside (see Global Constraints)
```

## Core Interfaces (Task 2/3/4 produce; later tasks consume)

**Contracts** — shapes exactly as [contracts §1–§4](../specs/contracts.md):
`muscleGroupSchema`, `equipmentSchema`, `exerciseTypeSchema`,
`setTypeSchema`, `workoutStatusSchema`, `exerciseSchema`,
`workoutSetSchema`, `workoutEntrySchema`, `workoutSchema`,
`settingsSchema`, `createExerciseRequestSchema`,
`createWorkoutRequestSchema`, `updateWorkoutRequestSchema`,
`finishWorkoutRequestSchema`, `updateSettingsRequestSchema`,
`apiErrorSchema` + inferred types (`Exercise`, `WorkoutSet`,
`WorkoutEntry`, `Workout`, `Settings`, `ApiError`).

**API client** (`apps/web/src/api/client.ts`):

```ts
export class ApiError extends Error {
  code: "bad_request" | "unauthorized" | "not_found" | "conflict" | "internal";
  status: number;
  details?: Record<string, unknown>;
}
export async function apiGet<T>(path: string, schema: ZodType<T>): Promise<T>;
export async function apiSend<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body: unknown,
  schema: ZodType<T>,
): Promise<T>;
```

**Query/mutation hooks** (`apps/web/src/api/hooks.ts`):

```ts
export function useExercises(): UseQueryResult<Exercise[]>;
export function useExercise(id: string): UseQueryResult<Exercise>;
export function useCreateExercise(): UseMutationResult<Exercise, ApiError, CreateExerciseInput>;
export function useWorkouts(limit?: number): UseQueryResult<Workout[]>;
export function useWorkout(id: string): UseQueryResult<Workout>;
export function useActiveWorkout(): UseQueryResult<Workout | null>;
export function useCreateWorkout(): UseMutationResult<Workout, ApiError, { title?: string }>;
export function useUpdateWorkout(
  id: string,
): UseMutationResult<Workout, ApiError, UpdateWorkoutInput>;
export function useFinishWorkout(): UseMutationResult<Workout, ApiError, string>; // arg: workout id
export function useDeleteWorkout(): UseMutationResult<void, ApiError, string>;
export function useSettings(): UseQueryResult<Settings>;
export function useUpdateSettings(): UseMutationResult<Settings, ApiError, Partial<Settings>>;
// Query keys: ['exercises'], ['exercise', id], ['workouts', limit],
//             ['workout', id], ['workout-active'], ['settings']
// Workout mutations invalidate ['workouts'] and ['workout', id].
```

**Active workout store** (`apps/web/src/stores/activeWorkout.ts`) —
optimistic mirror; each method PATCHes the server, then adopts the
server's `updatedAt`:

```ts
export interface ActiveWorkoutState {
  workout: Workout | null;
  hydrate(): Promise<void>; // GET /workouts/active → mirror (boot)
  startWorkout(title?: string): Promise<void>; // POST /workouts (409 if exists → hydrate)
  addExercise(exerciseId: string): Promise<void>; // appends entry + 1 empty normal set
  removeEntry(entryId: string): Promise<void>;
  addSet(entryId: string, type?: SetType): Promise<void>;
  updateSet(entryId: string, setId: string, patch: Partial<WorkoutSet>): Promise<void>;
  removeSet(entryId: string, setId: string): Promise<void>;
  moveEntry(entryId: string, direction: -1 | 1): Promise<void>;
  setEntryNotes(entryId: string, notes: string): Promise<void>;
  toggleSuperset(entryId: string, otherEntryId: string): Promise<void>;
  setTitle(title: string): Promise<void>;
  setBodyWeight(kg: number | null): Promise<void>;
  finishWorkout(): Promise<string>; // POST /workouts/:id/finish → invalidate
  discardWorkout(): Promise<void>; // DELETE /workouts/:id → clear
}
```

**Rest timer** (`apps/web/src/stores/restTimer.ts`):

```ts
export interface RestTimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  start(totalSeconds?: number): void; // default: settings.restTimerSeconds
  pause(): void;
  resume(): void;
  cancel(): void;
  addSeconds(n: number): void;
}
```

**Stats/units** (`apps/web/src/lib/`):

```ts
export function estimate1RM(weightKg: number, reps: number): number; // Epley: w * (1 + reps/30)
export function bestSetByEpley(
  sets: WorkoutSet[],
): { weightKg: number; reps: number; oneRM: number } | null;
export function workoutVolumeKg(w: Workout): number; // done strength sets, warmups excluded
export function weeklyVolumeSeries(
  workouts: Workout[],
  weeks: number,
): { weekStart: number; volumeKg: number }[];
export function previousPerformance(
  workouts: Workout[],
  exerciseId: string,
): { weightKg: number; reps: number; rpe: number | null } | null;
export function kgToLb(kg: number): number;
export function lbToKg(lb: number): number;
export function kmToMi(km: number): number;
export function miToKm(mi: number): number;
export function displayWeight(kg: number | null, unit: "kg" | "lbs"): string;
```

---

### Task 1: Monorepo scaffold + infra

**Files:** Create: `package.json`, `bunfig.toml`, `tsconfig.base.json`,
`docker-compose.yml`, `.env.example`, `.gitignore`, `.oxlintrc.json`,
`.oxfmtrc.json`; empty workspaces `apps/api`, `apps/web`,
`packages/contracts` (each with `package.json` + `tsconfig.json`).

**Interfaces:** Produces root scripts used by every later task:

```jsonc
{
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun --filter \"@reph/*\" dev",
    "build": "bun --filter \"@reph/*\" build",
    "test": "bun run --filter \"@reph/*\" test",
    "typecheck": "bun run --filter \"@reph/*\" typecheck",
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix .",
    "format": "oxfmt .",
    "format:check": "oxfmt --check .",
    "db:generate": "bun run --filter @reph/api db:generate",
    "db:migrate": "bun --env-file=.env run --filter @reph/api db:migrate",
    "db:seed": "bun --env-file=.env run --filter @reph/api db:seed",
    "db:studio": "bun --env-file=.env run --filter @reph/api db:studio",
  },
  "packageManager": "bun@1.4.2",
}
```

- [ ] `git init` in `/mnt/d/Project/Reph`; write `.gitignore`
      (`node_modules/`, `.env`, `dist/`, `*.local`, `data/`, `.bun/`).
- [ ] Write root config files: workspaces as above;
      `docker-compose.yml` → service `postgres:16-alpine`, port `5432:5432`,
      env `POSTGRES_USER=reph`, `POSTGRES_PASSWORD=reph`,
      `POSTGRES_DB=reph`, volume `reph_pgdata:/var/lib/postgresql/data`;
      `.env.example` → `DATABASE_URL=postgres://reph:reph@localhost:5432/reph`,
      `REPH_API_TOKEN=`, `PORT=3001`.
- [ ] `tsconfig.base.json`: `strict: true`, `target: "ES2022"`,
      `module: "ESNext"`, `moduleResolution: "bundler"`,
      `verbatimModuleSyntax: true`, `noUncheckedIndexedAccess: true`.
      Each workspace tsconfig extends it with `composite` + `noEmit`.
- [ ] Scaffold the three workspace `package.json` files with names
      `@reph/api`, `@reph/web`, `@reph/contracts`, their scripts
      (`dev`/`build`/`test`/`typecheck` per app; api adds `db:*`), and
      placeholder `src/index.ts` / `src/index.ts` that exports nothing yet —
      so `bun install` and the script filters resolve.
- [ ] `bunfig.toml`: `[test] preload = []` at root; web adds its own
      preload for happy-dom (`happy-dom/preload`) when Task 5 lands.
- [ ] Verify: `bun install` succeeds;
      `docker compose up -d && docker compose ps` shows healthy postgres;
      `bun run typecheck && bun test && bun run lint` pass (trivially).
- [ ] Commit: `chore: scaffold bun monorepo with postgres compose`

### Task 2: Contracts package

**Files:** Create: `packages/contracts/src/{enums,entities,requests,errors,index}.ts`,
`packages/contracts/src/entities.test.ts`.

**Interfaces:** Produces every export listed under **Core Interfaces →
Contracts**. No runtime deps except `zod`.

- [ ] Write failing tests (`bun test` in `packages/contracts`):
      parse a valid `Exercise` / `Workout` fixture (full nesting, 2 sets);
      reject `rpe: 11`; reject `weightKg: -1`; reject non-UUID id;
      `updateWorkoutRequestSchema` accepts partial body **with**
      `expectedUpdatedAt` and rejects without it; `apiErrorSchema` accepts
      the documented envelope.
- [ ] Run `bun test --filter @reph/contracts` → FAIL (imports missing).
- [ ] Implement `enums.ts`, `entities.ts`, `requests.ts`, `errors.ts`
      exactly per [contracts §1–§4](../specs/contracts.md); `index.ts`
      re-exports all. Add `.toISOString()`-independent epoch-ms numbers
      everywhere (no `z.date()`).
- [ ] Run `bun test` → PASS; `bun run typecheck && bun run lint`.
- [ ] Commit: `feat(contracts): zod schemas for all wire shapes`

### Task 3: Drizzle schema, migrations, seed

**Files:** Create: `apps/api/src/db/{schema,client,migrate,seed}.ts`,
`apps/api/src/db/schema.test.ts`, `apps/api/src/db/seed.test.ts`,
`apps/api/drizzle.config.ts`. Modify: `apps/api/package.json`
(`db:generate`, `db:migrate`, `db:seed`, `db:studio` scripts using
`drizzle-kit` + `drizzle-orm/node-postgres/migrator`).

**Interfaces:** Produces Drizzle tables mirroring
[db-schema §1–§4](../data/db-schema.md) (`users` deferred, all MVP
tables now: `exercises`, `workouts`, `workout_entries`, `workout_sets`,
`settings`), exported `schema` object; `seedExercises(): Promise<number>`
(idempotent upsert of global library, returns inserted count).

- [ ] Write failing test (PGlite): create in-memory PGlite →
      `drizzle(pglite)` → apply schema via `pushSchema`/SQL → insert an
      exercise + workout with nested entries/sets through a transaction →
      read back in order; assert cascade: deleting workout removes
      entries+sets; assert restrict: deleting a referenced exercise throws;
      assert partial-unique one-active-workout rule
      (second active insert for same user fails).
- [ ] Run → FAIL.
- [ ] Implement `schema.ts`: pgEnums per [db-schema §2](../data/db-schema.md),
      tables per §1 with columns/indexes per §3 (kg `numeric(6,2)`,
      timestamps `timestamptz`, `superset_id uuid null` without FK),
      `workouts` partial unique index `(user_id) where status = 'active'`.
- [ ] `bun run db:generate` → produces first migration in
      `apps/api/drizzle/`; `db:migrate` script runs it against
      `DATABASE_URL`.
- [ ] Implement `seed.ts`: ≥ 120 curated exercises (coverage rule:
      every `muscle_group` present; ≥ 10 `type='cardio'`; equipment
      correct per exercise) upserted by name where `user_id is null`;
      `seed.test.ts` asserts count and coverage (same assertions as the
      DB test above, on PGlite).
- [ ] Run tests + typecheck; against real DB:
      `docker compose up -d && bun run db:migrate && bun run db:seed`
      (idempotent: run seed twice, count unchanged).
- [ ] Commit: `feat(api): drizzle schema, migration, exercise seed`

### Task 4: Hono API modules

**Files:** Create: `apps/api/src/{index,app,env}.ts`,
`apps/api/src/lib/{errors,auth,pagination}.ts`,
`apps/api/src/modules/{health,exercises,workouts,settings}.ts` +
co-located `*.test.ts`. Modify: `apps/api/package.json` (`dev`:
`bun --watch src/index.ts`).

**Interfaces:** Produces the endpoint set of
[PRD-API §3](../specs/PRD-API.md) (all Phase-1 rows 🟩) with
`createApp(deps: { db: DrizzleDB })` so tests inject PGlite; throws
`ApiError` rendered by a top-level error handler into the
[envelope](../specs/contracts.md) §4.

- [ ] Write failing tests first — one describe per module, PGlite-backed
      `createApp`, using `app.request()` (no TCP):
      health returns `db:'up'`; bearer middleware rejects missing/wrong
      token with 401 and passes with `REPH_API_TOKEN` set (inject env via
      deps, not `process.env` mutation); exercises list filters by
      `muscleGroup` + `q`; custom create → 201 + `isCustom:true`, global
      delete → 409; workouts: create → 201, second create → 409,
      `GET /active` → row, PATCH with wrong `expectedUpdatedAt` → 409,
      PATCH replaces entries atomically (old child rows gone), finish sets
      `endTime` + `status:'completed'`, finish twice → 409, limit/before
      pagination ordered desc; settings GET seeds defaults
      (`kg`, `90s`, `dark`, `en`), PUT merges partial.
- [ ] Run → FAIL.
- [ ] Implement in order: `env.ts` (zod), `lib/errors.ts`
      (`ApiError` + handler mapping code→status:
      bad_request 400, unauthorized 401, not_found 404, conflict 409,
      internal 500; unknown errors → 500 + log, never leak messages),
      `lib/auth.ts`, `lib/pagination.ts` (`limit` default 50 max 200,
      `before` epoch-ms).
- [ ] Implement modules with Drizzle; `workouts.ts` handles the nested
      replace inside `db.transaction`; row→contract mapping function
      `toWorkoutDTO(row, entries, sets)` per contracts (epoch-ms numbers).
- [ ] `index.ts`: `Bun.serve({ port: env.PORT, fetch: app.fetch })`,
      log `Reph API → http://localhost:3001`.
- [ ] Run tests → PASS; smoke against real DB: `bun run db:migrate &&
  bun --env-file=.env run --filter @reph/api dev`, then
      `curl localhost:3001/health` and one `POST /api/v1/workouts` with
      `-H "Authorization: Bearer $REPH_API_TOKEN"` (token set in `.env`).
- [ ] Flip implemented rows in [PRD-API §3](../specs/PRD-API.md) to 🟩.
- [ ] Commit: `feat(api): exercises, workouts, settings, health modules`

### Task 5: Web scaffold (shell, design, i18n, api layer)

**Files:** Create: `apps/web/{vite.config.ts,index.html,tsconfig.json}`,
`src/{main.tsx,router.tsx,app.css}`, `src/i18n/{index.ts,en.json,id.json}`,
`src/api/{client.ts,hooks.ts}`, `src/components/layout/{AppShell,TabBar}.tsx`,
`src/components/ui/{Button,Input,Sheet,SegmentedControl,NumberStepper,Card,EmptyState,ErrorState,Skeleton}.tsx`,
placeholder screens (Today/History/Exercises/Settings), `public/icons/*`,
`src/lib/id.ts`. Modify: `bunfig.toml` (web happy-dom preload).

**Interfaces:** Produces routes `/`, `/history`, `/exercises`,
`/settings` rendering placeholders; the API client + hooks exactly per
**Core Interfaces**; UI components per [DESIGN §3](../guides/DESIGN.md).

- [ ] Vite config: `@vitejs/plugin-react`, `tailwindcss` plugin,
      `vite-plugin-pwa` (`manifest`: name "Reph", `theme_color #0a0a0b`,
      categories `["health","fitness"]`, shortcut **Log Workout** →
      `/workout/active`, icons 192/512/maskable — generate simple SVG-based
      PNGs now), dev proxy `/api` → `http://localhost:3001`.
- [ ] `app.css`: Tailwind v4 `@import "tailwindcss";` + `@theme` tokens
      per [DESIGN §2](../guides/DESIGN.md) (light `:root`, dark `.dark`,
      accent green, `.numeric` class). `index.html`: viewport
      `viewport-fit=cover`, color-scheme meta, dark class on `<html>`.
- [ ] i18n init (`en`/`id`, `lng:'en'`), seed keys for shell
      (`app.name`, `tabs.*`, `common.*` retry/loading/cancel/confirm).
- [ ] `api/client.ts` per signature (fetch wrapper: JSON, auth header
      from `import.meta.env.VITE_REPH_TOKEN`, parse `apiErrorSchema` →
      throw `ApiError`); `api/hooks.ts` with `QueryClientProvider`
      (`retry: false`, `staleTime: 30_000`) and the exported hooks.
- [ ] Router (code-based tree) with `AppShell` root: safe-area bottom
      `TabBar` (Today · History · Exercises · Settings, accent active state,
      `aria-current`), content outlet, `RestTimerBar` mount point.
- [ ] UI components + `Skeleton`/`EmptyState`/`ErrorState` with all four
      screen states documented in [DESIGN §4](../guides/DESIGN.md).
- [ ] Verify: `bun run --filter @reph/web dev` renders the shell;
      `bun run typecheck && bun test` green; `bun run build` produces a
      manifest in `dist/`.
- [ ] Commit: `feat(web): app shell, design tokens, api client, i18n`

### Task 6: Stats & units libraries

**Files:** Create: `src/lib/{stats,units}.ts`,
`tests/{stats,units}.test.ts`.

**Interfaces:** Produces every function under **Core Interfaces →
Stats/units** (consumed by Tasks 7–11).

- [ ] Write failing tests: `estimate1RM(100,5)≈116.67`;
      `estimate1RM(w,1)===w`; `bestSetByEpley` picks the set with max Epley
      (not max weight) and returns null on empty/all-null; `workoutVolumeKg`
      counts only `done` sets excluding `warmup` and cardio sets;
      `weeklyVolumeSeries` buckets by local Monday across N weeks ascending;
      `previousPerformance` returns the most recent done set's triple and
      **null** when exercise never performed; converters exact (2.20462 /
      0.621371); `displayWeight(80,'kg')==='80 kg'`, lb variant 1 decimal.
- [ ] Run → FAIL → implement pure functions → PASS.
- [ ] Commit: `feat(web): stats and unit helpers with tests`

### Task 7: Exercise library UI

**Files:** Create: `src/screens/{ExercisesScreen,ExerciseDetailScreen}.tsx`,
`src/components/exercise/ExerciseListItem.tsx`, routes
`/exercises`, `/exercises/$id`. Modify: `src/api/hooks.ts`
(add `useCreateExercise`), `src/i18n/*`, `docs/features/README.md`
(add exercise-library row → status file link when done).

**Interfaces:** Consumes: `useExercises`, `useCreateExercise`,
`useExercise`, `useWorkouts`, `previousPerformance`, `bestSetByEpley`.
Produces: `ExercisePicker` is NOT here (Task 9); screens referenced by
Today (Task 11).

- [ ] `ExercisesScreen`: `useExercises` + search input (debounced 200 ms,
      `q` param) + muscle-group filter via `Sheet` + `SegmentedControl`;
      sticky group headers; `Skeleton` while loading, `EmptyState` on no
      results, `ErrorState` with retry. FAB "+" → sheet form (name ≥ 1 char,
      muscle group, equipment, type segmented) → `useCreateExercise`.
- [ ] `ExerciseDetailScreen`: badges; **PR card** — scan `useWorkouts(200)`
      entries for this exercise → `bestSetByEpley` over each workout's sets →
      global best with date; **history list** — most recent first, best set
      of each session highlighted, "previous" line via
      `previousPerformance`; all weights through `displayWeight` with
      settings from `useSettings`.
- [ ] i18n keys for every string; manual pass: create custom exercise →
      appears in list/detail.
- [ ] Tests: component test for search filtering + one for the create
      form validation (happy-dom, mock hooks module).
- [ ] `bun run typecheck && bun test && bun run lint`; commit
      `feat(web): exercise library browse, create, and detail history`

### Task 8: Active workout store (server-backed)

**Files:** Create: `src/stores/activeWorkout.ts`,
`src/stores/activeWorkout.test.ts`. Modify: `src/main.tsx` (call
`hydrate()` on boot).

**Interfaces:** Produces `useActiveWorkout` exactly per **Core
Interfaces → Active workout store**; consumes hooks + `newId()`.

- [ ] Write failing tests (mock `src/api/hooks` with an in-memory
      workout; `useActiveWorkout.getState()`): `startWorkout` posts and
      mirrors (non-null workout, `status:'active'`); `hydrate` with active
      row restores mirror, with `null` clears it; `addExercise` appends
      entry (`position` = n) + one empty normal set; `addSet`/`updateSet`
      (patch + bumps `position` order stability)/`removeSet`; `moveEntry`
      swaps positions; `toggleSuperset` creates one `supersetId` on both
      entries, second toggle clears both; `setTitle`/`setBodyWeight`;
      every mutation awaits the API **before** state commit except
      `updateSet` which applies optimistically and rolls back on rejection;
      `finishWorkout` calls finish, clears mirror, returns id;
      `discardWorkout` deletes and clears.
- [ ] Run → FAIL → implement (single `commit(workout)` helper that
      PATCHes full entries payload with `expectedUpdatedAt`, updates mirror
      from response, invalidates `['workouts']`) → PASS.
- [ ] Commit: `feat(web): server-backed active workout store`

### Task 9: Logging UI + exercise picker + rest timer

**Files:** Create: `src/screens/ActiveWorkoutScreen.tsx`,
`src/components/workout/{SetRow,EntryCard,ExercisePicker,RestTimerBar}.tsx`,
`src/stores/restTimer.ts` + test, route `/workout/active` (+ redirect
guard: no active workout → `/`).

**Interfaces:** Consumes: `useActiveWorkout`, `useExercises`,
`useSettings`, `useWorkouts` (previous performance), stats/units.
Produces: `ExercisePicker` props
`{ open, onOpenChange, onSelect(exerciseId) }` (reused Phase 2 from
templates); `RestTimerBar` rendered in `AppShell`.

- [ ] `restTimer` store: fake-timer tests for start/pause/resume/cancel/
      `addSeconds`, beep at zero (WebAudio oscillator mocked),
      `navigator.vibrate` guarded, completion sets `isRunning:false`.
- [ ] `SetRow` (strength): `[✓] [weight] × [reps] [RPE] [badge] [⋯]`
      — tap-to-edit `Input` (`inputMode="decimal"`), commit on blur/Enter,
      display via `displayWeight` / input→kg via `lbToKg`; badge cycles
      normal→warmup→drop→failure from ⋯ menu (menu also deletes); RPE
      0–10 half-point stepper in a small popover. Cardio variant renders
      duration/distance/calories fields (read from `Exercise.type`).
- [ ] `EntryCard`: header (name → popover showing last performance +
      "repeat" prefill button), superset badge/toggle (⋯ → pick sibling
      entry), collapsible notes, "+ Add set" (then `restTimer.start()` if
      previous set was done), ⋯ menu (replace exercise, move up/down,
      delete with confirm).
- [ ] `ExercisePicker`: `Sheet` with search, recent 5 (from
      `useWorkouts(10)`), full library grouped; `EmptyState` for no matches.
- [ ] `ActiveWorkoutScreen`: sticky header (editable title, elapsed
      ticker `Date.now()-startTime`, Finish primary button, ⋯ →
      body-weight input + discard confirm); list of `EntryCard`s; "Add
      exercise" button; offline banner per [PRD-FE §4](../specs/PRD-FE.md)
      (writes blocked with inline note when `navigator.onLine === false`).
- [ ] Manual E2E on device-width viewport: start → 2 exercises →
      warmup+normal sets → superset → timer beeps → finish → row appears in
      history query; refresh mid-workout → `hydrate()` restores session.
- [ ] Commit: `feat(web): workout logging UI with rest timer`

### Task 10: History & workout detail

**Files:** Create: `src/screens/{HistoryScreen,WorkoutDetailScreen}.tsx`,
route `/workouts/$id`. Modify: `src/i18n/*`, `src/components/workout/EntryCard.tsx`
(add `readOnly` prop used by detail).

**Interfaces:** Consumes: `useWorkouts`, `useWorkout`, mutations
(`useUpdateWorkout`, `useDeleteWorkout`), stats/units.

- [ ] `HistoryScreen`: group by month (`date-fns` `format(it, 'LLLL yyyy')`),
      row = date day + title + duration + volume + set count; skeleton /
      empty ("No workouts yet" → CTA to `/`) / error states.
- [ ] `WorkoutDetailScreen`: stats strip (duration, volume, sets, reps),
      `EntryCard`s `readOnly`, workout notes; **Edit** → inline edit mode
      reusing `SetRow` inputs → Save calls `useUpdateWorkout` with
      `expectedUpdatedAt` (409 → conflict prompt with Reload); **Delete** →
      confirm dialog → navigate `/history`.
- [ ] Tests: history grouping (given workouts across 2 months → 2 headers
      ascending); detail renders sets; conflict path shows reload prompt
      (mocked mutation rejection with `ApiError code:'conflict'`).
- [ ] Commit: `feat(web): history list and workout detail with edit/delete`

### Task 11: Settings & Today

**Files:** Create: `src/screens/{SettingsScreen,TodayScreen}.tsx`.
Modify: `src/main.tsx` (apply theme class + language from settings on
boot), `src/i18n/*`.

**Interfaces:** Consumes: `useSettings`, `useUpdateSettings`,
`useWorkouts`, `useActiveWorkout`, `useCreateWorkout`,
`weeklyVolumeSeries`, `bestSetByEpley`.

- [ ] `SettingsScreen`: sections Appearance (theme), Units (weight,
      distance), Rest timer (presets 30/60/90/120/180 + custom
      `NumberStepper`), Language (English / Bahasa Indonesia), About
      (version, one-line data-ownership note). Each change →
      `useUpdateSettings` → immediate effect: `documentElement.classList`
      dark/light, `i18n.changeLanguage`, rest-timer store default.
- [ ] `TodayScreen`: greeting + date; primary Start (→
      `useCreateWorkout` → navigate `/workout/active`) or Resume when
      active exists; this-week row (workouts, total volume, total sets via
      `weeklyVolumeSeries(…, 1)`); recent PRs (≤ 3 across last 20 workouts,
      `bestSetByEpley`, `displayWeight`); recent workouts (≤ 5, reuse
      history row component); first-run `EmptyState`.
- [ ] i18n completeness audit for all screens so far (both files).
- [ ] Commit: `feat(web): settings and today home screen`

### Task 12: PWA polish, docs sync, release gate

**Files:** Modify: `apps/web/vite.config.ts` (manifest polish,
`navigateFallback`), `public/icons/*`, `docs/specs/PRD-API.md` (all
Phase-1 rows 🟩), `docs/features/README.md` (statuses), `docs/data/db-schema.md`
(verify diagram vs `schema.ts`), root `README.md` (accuracy pass).

**Interfaces:** none new — gate only.

- [ ] Offline check: `bun run build && bun run --filter @reph/web preview`
      → DevTools offline → full reload → shell renders, banner shows, writes
      blocked gracefully; online → writes resume.
- [ ] i18n grep gate: no string literals in `src/screens` +
      `src/components` (excluding tests) reaching UI — fix stragglers into
      `t()`.
- [ ] Docs sync: statuses, schema diagram, features table — as above.
- [ ] **Release gate (all must pass):**
      `bun run typecheck && bun test && bun run lint && bun run format:check && bun run build`
      plus the manual checklist: start → log (warmup/drop/superset/RPE) →
      timer beep → finish → history → detail edit (incl. conflict path) →
      delete → exercise PR → custom exercise → settings kg→lb display switch
      → theme switch → language switch → offline reload → PWA install on
      Android Chrome (Add to Home Screen) and iOS Safari.
- [ ] Commit: `chore: phase 1 release gate — pwa polish, docs sync`

---

## After Phase 1

Next plan: **Phase 2** (progress photos + routines/templates +
calendar/streak) — written to `docs/plans/phase-2-photos-routines.md`
when Phase 1's release gate is green. See
[PRD §4](../specs/PRD.md) for roadmap and
[features](../features/README.md) for the acceptance index.
