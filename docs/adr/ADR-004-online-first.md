---
aliases:
  - ADR-004
tags:
  - reph
  - adr
status: accepted
updated: 2026-10-29
---
# ADR-004: Online-First Operation (API as Single Source of Truth)

**Status:** Accepted
**Date:** 2026-10-29
**Deciders:** repo owner
**Related:** [PRD](../specs/PRD.md) §1.3 · [PRD-FE](../specs/PRD-FE.md) §4 ·
[PRD-API](../specs/PRD-API.md) §3 · [ADR-003](./ADR-003-postgres-docker.md)

---

## 1. Context

Workouts are logged from a phone, frequently in a gym. Two candidate
models were on the table:

1. **Offline-first with a write queue** — the client writes to a local
   store (IndexedDB) while offline and synchronizes with the server when
   connectivity returns. Requires conflict resolution, queue durability,
   ordering guarantees, and a sync UI — a substantial subsystem of its
   own.
2. **Online-first** — the server is the only writer; the client requires
   a reachable API for mutations, keeps a read cache for resilience, and
   degrades to a clear read-only offline state.

The owner trains where mobile data is available and accepted the
requirement that logging needs connectivity, explicitly trading offline
capability for implementation and debugging simplicity.

## 2. Decision

- **The API is the single source of truth.** All mutations go over HTTP;
  there is no client-side write queue in v1.
- **The active workout lives on the server** (`workouts.status='active'`),
  so a closed tab, crashed browser, or phone restart resumes the session
  after reconnect — resilience without offline writes.
- The client keeps a **TanStack Query read cache** and shows a
  persistent *offline / stale* banner when `navigator.onLine` is false or
  a health probe fails; reads serve last-known data, writes are blocked
  with an inline explanation ([PRD-FE §4](../specs/PRD-FE.md)).
- The PWA service worker caches the **app shell only** (instant loads),
  not API responses as authoritative data.

## 3. Consequences

- ✅ No sync engine, no merge conflicts, no queue corruption — one code
  path for every write, trivially testable end-to-end.
- ✅ Multi-device "sync" is automatic: every device reads the same
  server state.
- ⚠️ No logging without a reachable server (mitigated: deploy target is
  always-on once chosen — [ADR-005](./ADR-005-self-hosted-stb.md) — and
  phones have data in gyms).
- ⚠️ Unsaved client input exists only in the in-memory logging store
  while offline; the UI never silently discards it and offers retry on
  reconnect (acceptance in [PRD-FE §4](../specs/PRD-FE.md)).
- Revisit trigger: if the owner reports real-world training without
  connectivity, an offline write queue becomes a Phase-4 candidate —
  the `expectedUpdatedAt` conflict guard and client-generated UUIDs in
  [PRD-API](../specs/PRD-API.md) deliberately keep that door cheap.
