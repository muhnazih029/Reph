---
aliases:
  - ADR-005
tags:
  - reph
  - adr
status: accepted
updated: 2026-10-29
---
# ADR-005: Self-Hosted Target — Home STB (1 GB RAM / 4 GB Storage)

**Status:** Accepted (with open items §4)
**Date:** 2026-10-29
**Deciders:** repo owner
**Related:** [ADR-003](./ADR-003-postgres-docker.md) ·
[PRD](../specs/PRD.md) §1.3 · [PRD-API](../specs/PRD-API.md) §5 ·
[DEVELOPMENT](../guides/DEVELOPMENT.md) §4

---

## 1. Context

Reph must be reachable from the owner's phone (including outside the
home network) and run continuously. The available hardware is a
**set-top box (STB)** on the owner's tailnet (`azdastudio`,
`ssh azda@azdastudio`). Verified in place on 2026-10-29:

| Fact | Observed |
|------|----------|
| Architecture | `aarch64` — **Bun-compatible** ✅ |
| OS | Armbian 26.5.1 (Ubuntu 26.04 base), kernel 6.18 |
| RAM | 784 MB total (~300 MB available + 355 MB reclaimable cache) |
| Root disk | 6.5 GB, **1.4 GB free (80 % used)** |
| Container runtime | Docker 29.8.1 **and** Podman 5.7.0 installed, 4 containers up 4 weeks ✅ |
| Existing images | `postgres:16-alpine` (411 MB) **already on disk** — Reph's DB adds zero image weight |
| Tailscale | running (`100.113.250.36`), SSH access confirmed |

The box is a proven little server (monitoring, a second Postgres-backed
app, Syncthing, PM2 already run on it) — but RAM and free disk are the
real constraints, and photo files (Phase 2) compete for the same disk.

## 2. Decision

The STB is the **primary deployment target**, with the stack sized for
it:

| Concern | Choice |
|---------|--------|
| OS | Armbian/Ubuntu 26.04 — **verified running** ✅ |
| DB | `postgres:16-alpine` container (image already on device) with tuned-down config (`shared_buffers` ≤ 64 MB, `max_connections` low); nightly `pg_dump` to a file (cheap, restorable) |
| API | Bun **aarch64** release binary (no toolchain on device), single process ≈ 60–100 MB RSS |
| Web | Static build (`vite build`) served by the API — no build tooling running in prod |
| Photos (Phase 2) | Files under `REPH_DATA_DIR/photos/`, never in Postgres; photos are the main disk risk — enforce the 1600 px downscale cap (~200–400 KB/file), document a cleanup path, and watch the 1.4 GB free ceiling |
| Remote access | Tailscale (already installed and SSH-proven; API exposed via `tailscale serve` — no open ports). **Open item** §4.3: confirm serve/funnel setup at deploy time |
| Backups | nightly `pg_dump` → `/home/azda/backups/` (Syncthing already syncs `/home` off-box) — **Open item** §4.4: define cadence + restore drill |

RAM budget check: ~300 MB available today; Reph adds Bun API
(60–100 MB) + a tuned Postgres (60–90 MB) → fits, with the page cache
as buffer. If RAM gets tight, the fallback is a **separate logical
database inside the existing `sigap-db` Postgres container** (saves
~80 MB, at the cost of coupling to another app's lifecycle) — revisit
only under memory pressure.

## 3. Consequences

- ✅ Always-on home server ⇒ the online-first model
  ([ADR-004](./ADR-004-online-first.md)) works from anywhere the phone
  has data.
- ✅ No hosting cost; data never leaves the owner's home (minus backups).
- ⚠️ RAM is the tight resource (784 MB total, ~300 MB free today):
  Postgres config must be tuned down (≤ 64 MB `shared_buffers`), and
  heavy features (photo processing, future dashboards) must stay
  incremental.
- ⚠️ SD/NAND write endurance on STBs — WAL-heavy workloads should stay
  modest (they do: a personal app's write rate is tiny).
- ⚠️ If the STB itself fails, fallback target is any always-on Linux
  host; nothing in the app assumes this specific device.

## 4. Open items

1. ~~Verify STB architecture~~ — **resolved 2026-10-29:** `aarch64`,
   Bun-supported; Armbian with Docker confirmed (§1 table).
2. ~~Confirm a container runtime~~ — **resolved 2026-10-29:** Docker
   29.8.1 running 4 stable containers; `postgres:16-alpine` image
   already present.
3. **Remote access wiring:** Tailscale is installed and SSH-proven;
   decide `tailscale serve` (HTTPS via tailnet, recommended — no open
   ports) for the API + web at first deployment, and keep
   `REPH_API_TOKEN` enforced regardless.
4. **Backup cadence + restore drill:** nightly `pg_dump` (Syncthing
   already mirrors `/home` off-box) — define exact script and schedule,
   and run one restore test at deployment.
