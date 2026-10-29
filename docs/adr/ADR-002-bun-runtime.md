---
aliases:
  - ADR-002
tags:
  - reph
  - adr
status: accepted
updated: 2026-10-29
---
# ADR-002: Bun as the Sole Runtime

**Status:** Accepted
**Date:** 2026-10-29
**Deciders:** repo owner
**Related:** [README](../../README.md) · [DEVELOPMENT](../guides/DEVELOPMENT.md) §1/§5.2 ·
[ADR-001](./ADR-001-monorepo-layout.md)

---

## 1. Context

The project needs a runtime for the API, the tooling (scripts, migrations,
tests), and package installation. Node works, but the owner prefers Bun
and the app has no dependency on Node-only APIs (no `node:fs` watchers,
no native modules requiring Node ABI). Mixing runtimes (Bun install +
Node tests + Node scripts) would mean two toolchains to keep aligned and
a confusing README for a public repo.

## 2. Decision

**Bun everywhere** — `packageManager: bun@1.4`, `bun install`, `bun run`,
`bun test`, `bun --filter` workspace scripts, code targeting Bun's
built-ins with `@types/bun`. Lint/format via **oxlint + oxfmt**
(Bun-native speed, no ESLint/Prettier config sprawl).

Specifics:

- API entry: `Bun.serve` wrapping Hono's `app.fetch` (no extra adapter).
- Tests: `bun test` (jest-style API) for all workspaces; DB-backed API
  tests run on **PGlite** (in-process Postgres, no TCP) so the unit tier
  stays compose-free ([ADR-003](./ADR-003-postgres-docker.md)).
- Web build remains Vite's job (`bun run build` → `tsc -b && vite build`);
  Vite runs fine as a Bun child process.
- CI (when added) installs Bun via `oven-sh/setup-bun` — no Node setup.

## 3. Consequences

- ✅ One toolchain; `bun install && bun run dev` is the whole story.
- ✅ Fast installs and test runs on a low-resource machine
  ([ADR-005](./ADR-005-self-hosted-stb.md)).
- ⚠️ A dependency that hard-requires Node (rare, usually native addons)
  must be replaced, not polyfilled — decision: prefer alternatives.
- ⚠️ Vitest/Jest-style ecosystem tooling (e.g. jsdom-heavy setups) is off
  the table; component tests use `bun test` + `@testing-library/react`
  with happy-dom.
- Rejected alternatives: **Node** (works, but two-runtimes drift and the
  owner's stated preference), **Deno** (fine tooling, less familiar
  ground for this codebase).
