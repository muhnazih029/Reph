---
aliases:
  - ADR-001
tags:
  - reph
  - adr
status: accepted
updated: 2026-10-29
---
# ADR-001: Monorepo Layout

**Status:** Accepted
**Date:** 2026-10-29
**Deciders:** repo owner
**Related:** [PRD](../specs/PRD.md) · [PRD-API](../specs/PRD-API.md) ·
[PRD-FE](../specs/PRD-FE.md) · [DEVELOPMENT](../guides/DEVELOPMENT.md) §2

---

## 1. Context

Reph is a client (React PWA) plus a server (REST API) that share one
thing above all: the shape of every record that crosses the wire. Without
a deliberate structure, type drift between the two apps is the default
outcome — the API accepts `{ weight_kg }` while the client sends
`{ weightKg }`, and tests only catch it after integration.

The repo must also present well on GitHub as a maintained project, and be
navigable by one person a year from now.

## 2. Decision

A **Bun-workspaces monorepo** with three workspaces:

```text
apps/web        # React PWA — consumes contracts, never imports api code
apps/api        # Hono API — validates with contracts, owns schema.ts
packages/contracts  # Zod schemas + inferred types — the only shared code
```

Rules:

- `packages/contracts` is the **single source of truth** for wire shapes
  ([contracts spec](../specs/contracts.md)); both apps import types from
  it. Neither app imports from the other.
- The Drizzle schema stays in `apps/api` (server concern) — the web app
  talks to the API, never to the database.
- Root `package.json` owns workspace scripts (`bun run --filter …`),
  tooling config (oxlint, tsconfig base), and docs.

## 3. Consequences

- ✅ Type change is a compile error in both apps in one `bun run typecheck`.
- ✅ One PR can ship an API field + the UI that uses it.
- ⚠️ Contracts must not accidentally grow server-only logic (Zod only —
  no DB/HTTP imports; enforced by review).
- Rejected alternative: **separate repos** — overkill for one owner and
  guarantees version-skew overhead. **Single app with server routes**
  (e.g. TanStack Start server functions) — viable, but a hard boundary
  keeps the API independently testable and curl-able, which matters more
  here.
