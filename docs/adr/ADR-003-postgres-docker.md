---
aliases:
  - ADR-003
tags:
  - reph
  - adr
status: accepted
updated: 2026-10-29
---

# ADR-003: PostgreSQL 16 in Docker + Drizzle ORM

**Status:** Accepted
**Date:** 2026-10-29
**Deciders:** repo owner
**Related:** [db-schema](../data/db-schema.md) · [PRD-API](../specs/PRD-API.md) §5 ·
[DEVELOPMENT](../guides/DEVELOPMENT.md) §3 · [ADR-005](./ADR-005-self-hosted-stb.md)

---

## 1. Context

Reph's domain (workouts → entries → sets, routines, metrics, photos
metadata) is relational and will be queried relationally: history with
children, per-exercise PR aggregation, monthly calendar rollups, later
per-user scoping. The first draft explored browser-local storage
(IndexedDB) with sync deferred, and a file-based SQLite option.

Why not those:

- **IndexedDB-only** puts a non-relational, hard-to-query store at the
  center of a genuinely relational domain, and makes "same data on phone
  and laptop" a sync-engine project instead of a deployment step.
- **SQLite** is excellent and would run natively in Bun, but this project
  explicitly targets a home server that may later serve multiple users
  and needs safe concurrent access from two devices plus familiar
  operational tooling (backup = `pg_dump`, well-trodden paths). The owner
  selected PostgreSQL to match the stack they already operate elsewhere.

## 2. Decision

- **PostgreSQL 16** via `docker compose` (single service, named volume,
  dev credentials in `.env.example`).
- **Drizzle ORM** (`drizzle-orm` + `pg`) for schema-as-code, generated
  SQL migrations (`drizzle-kit generate`), and a `db:studio` browser.
- **PGlite** (`@electric-sql/pglite`) backs DB-backed unit tests in
  `bun test` — real Postgres semantics, zero TCP, compose-down green
  ([DEVELOPMENT §5.2](../guides/DEVELOPMENT.md)).
- Canonical column types are fixed in
  [db-schema](../data/db-schema.md) (kg/meters/seconds, `timestamptz`).

## 3. Consequences

- ✅ Real constraints/indexes back the Zod validation; PR queries are
  plain SQL/Drizzle.
- ✅ Backup story is one command; restore is standard Postgres.
- ✅ Unit tests keep real SQL semantics while staying CI-safe.
- ⚠️ Docker is a hard prerequisite (documented in README quickstart);
  the deployment target must run a container runtime
  ([ADR-005](./ADR-005-self-hosted-stb.md)).
- ⚠️ Migrations must be treated as append-only artifacts — never edit
  generated SQL (troubleshooting row in DEVELOPMENT guide).
- Rejected alternatives: **SQLite** — loses concurrent multi-device
  access comfort and the owner's operational familiarity; **ORM-abstracted
  multi-DB support** — YAGNI, one database.
