---
aliases:
  - Docs Index
  - MOC
tags:
  - reph
  - moc
status: living
updated: 2026-10-29
---

# Reph Docs — Map of Content

Start here. Every note below is linked with standard markdown links
(relative paths, GitHub/GFM-compatible).

## Product

- [PRD](./specs/PRD.md) — vision, goals, feature set, phased roadmap
  (`MVP → photos/routines → metrics → multi-user`). Status: draft `0.1-draft`.

## Specs (vertical slices share these contracts — defined once, referenced everywhere)

- [PRD-API](./specs/PRD-API.md) — REST modules, endpoint index, error/pagination
  contracts, storage conventions. Status: draft `0.1-draft`.
- [PRD-FE](./specs/PRD-FE.md) — routes, screens, data flow, i18n, PWA behavior.
  Status: draft `0.1-draft`.
- [contracts](./specs/contracts.md) — normative Zod shapes shared between apps.
  Planning scope: materializes into `packages/contracts/src/` when
  implementation starts.
- [db-schema](./data/db-schema.md) — canonical Mermaid ER + seed summary.

## Features (1 file per feature — acceptance index)

- [features/README](./features/README.md) — status table + template rules
  (bodies materialize as features are built).

## Decisions

| ADR                                       | Subject                                                        | Status    |
| ----------------------------------------- | -------------------------------------------------------------- | --------- |
| [ADR-001](adr/ADR-001-monorepo-layout.md) | Monorepo layout: `apps/web`, `apps/api`, `packages/contracts`   | accepted  |
| [ADR-002](adr/ADR-002-bun-runtime.md)     | Bun as the sole runtime (install, run, test, lint via oxlint)   | accepted  |
| [ADR-003](adr/ADR-003-postgres-docker.md) | PostgreSQL 16 in Docker + Drizzle ORM (PGlite for unit tests)   | accepted  |
| [ADR-004](adr/ADR-004-online-first.md)    | Online-first operation — the API is the single source of truth  | accepted  |
| [ADR-005](adr/ADR-005-self-hosted-stb.md) | Self-hosted target: home STB (1 GB RAM / 4 GB storage)          | accepted  |

## Guides

- [DEVELOPMENT](./guides/DEVELOPMENT.md) — repo map, env, dev loop,
  scripts, testing conventions, troubleshooting.
- [DESIGN](./guides/DESIGN.md) — design tokens, theming, i18n, component
  and state conventions.

## Plans

- [phase-1-mvp](./plans/phase-1-mvp.md) — detailed task-by-task MVP
  implementation plan (scaffold → API → logging UI → release gate).
