---
aliases:
  - Development Guide
tags:
  - reph
  - guide
  - development
status: draft
updated: 2026-10-29
---

# Development Guide

**Status:** Draft
**Related:** [README](../../README.md) · [ADR-001](../adr/ADR-001-monorepo-layout.md) ·
[ADR-002](../adr/ADR-002-bun-runtime.md) · [ADR-003](../adr/ADR-003-postgres-docker.md) ·
[DESIGN](./DESIGN.md)

---

## 1. Prerequisites

| Tool            | Version    | Notes                                 |
| --------------- | ---------- | ------------------------------------- |
| Bun             | ≥ 1.4      | runtime, package manager, test runner |
| Docker / Podman | any recent | PostgreSQL 16 only                    |
| Git             | any recent | —                                     |

## 2. Repo map

```text
.
├── apps/
│   ├── api/                  # Hono REST API
│   │   ├── src/
│   │   │   ├── index.ts      # Bun.serve entry
│   │   │   ├── app.ts        # createApp({ db }) — injectable for tests
│   │   │   ├── env.ts        # zod-parsed env (REPH_API_TOKEN, DATABASE_URL, REPH_DATA_DIR)
│   │   │   ├── db/           # drizzle schema, client, migrations, seed
│   │   │   ├── modules/      # health, exercises, workouts, settings (co-located tests)
│   │   │   └── lib/          # ApiError, auth middleware, pagination helpers
│   │   └── drizzle/          # generated SQL migrations
│   └── web/                  # React PWA
│       └── src/
│           ├── api/          # typed client + query hooks
│           ├── components/   # layout/, ui/, workout/, exercise/
│           ├── screens/      # one file per route
│           ├── stores/       # activeWorkout, restTimer (zustand)
│           ├── lib/          # stats, units (pure, unit-tested)
│           └── i18n/         # en.json, id.json
├── packages/
│   └── contracts/            # Zod schemas + inferred types (bun test)
├── docs/                     # this documentation
├── docker-compose.yml        # postgres:16 + volume
├── bunfig.toml
└── package.json              # workspaces, root scripts
```

## 3. Dev loop

```bash
cp .env.example .env       # once
docker compose up -d       # postgres
bun install                # once / after lockfile change
bun run db:migrate         # once / after schema change
bun run dev                # api (:3001) + web (:3000) + drizzle-kit watch
```

Day-to-day:

```bash
bun run typecheck          # tsc -b across workspaces
bun test                   # all tests (unit tier — no compose needed for api,
                           #  which uses PGlite; web tests are pure/component)
bun run lint && bun run format
bun run db:generate        # after editing apps/api/src/db/schema.ts
bun run db:seed            # idempotent exercise library upsert
```

## 4. Environment

`.env` (never committed; `.env.example` documents every key):

| Key              | Required                | Purpose                                                      |
| ---------------- | ----------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`   | yes                     | `postgres://reph:reph@localhost:5432/reph` (compose default) |
| `REPH_API_TOKEN` | prod yes / dev optional | bearer token; empty = auth disabled (local dev only)         |
| `REPH_DATA_DIR`  | Phase 2                 | directory for photo files (default `./data`)                 |
| `PORT`           | no                      | API port, default `3001`                                     |
| `WEB_PORT`       | no                      | Vite dev-server port, default `3000` (Vite's own default 5173 is not used) |

## 5. Conventions

### 5.1 Code

- TypeScript strict everywhere; no `any` in exported signatures.
- API: routes in `modules/`, business rules in route handlers until a
  rule is shared by ≥ 2 modules (then `lib/`), all SQL via Drizzle —
  no raw string queries outside `drizzle/`.
- Web: server state in TanStack Query only; client ephemeral state in
  zustand stores; screens never import the HTTP client directly — they
  use `src/api/hooks.ts`.
- Names: `camelCase` code, `snake_case` DB columns (Drizzle maps),
  enums as string unions in contracts.

### 5.2 Tests (bun test)

| Tier | Location                                   | Infra                                 | Rule                            |
| ---- | ------------------------------------------ | ------------------------------------- | ------------------------------- |
| Unit | co-located `*.test.ts`                     | none (PGlite for DB-backed api tests) | runs with compose **down**      |
| E2E  | `apps/api/test/`, `apps/web/test/` (later) | compose **up**                        | added when a flow spans modules |

- Given/When/Then structure; one behavior per test; factories in
  `test/factories.ts`.
- Coverage target ≥ 85 % lines for `apps/api/src` and `apps/web/src/lib`;
  satisfiable from the unit tier by design.
- Web component tests render with `@testing-library/react`; timer logic
  tested with `setSystemTime`/fake timers.

### 5.3 Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Every plan task ends green (`typecheck + test + lint`) and committed.
- Schema changes: migration + `db-schema.md` diagram updated in the
  same commit.

## 6. Troubleshooting

| Symptom                       | Fix                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ECONNREFUSED 5432`           | `docker compose up -d`, check `docker compose ps`                                                             |
| Migration drift errors        | `bun run db:generate` then `bun run db:migrate`; never edit generated SQL                                     |
| Port 3000/3001 busy           | set `WEB_PORT` / `PORT` in `.env` (Vite runs `strictPort`, so it errors instead of switching to 5173), or stop the other process |
| Web tests hang on fetch       | queries not mocked — wrap with `QueryClientProvider({ queries: { retry: false } })` and mock `src/api/client` |
| Stale PWA assets after deploy | hard-reload; service worker is `autoUpdate`                                                                   |
