# Reph

A self-hosted workout tracker for personal training — log sessions with sets,
reps, and RPE, browse a full exercise library, and follow your progression
through PRs, volume trends, and private progress photos. Your data lives on
your own server.

Status: pre-release (`0.x`). Product spec is at draft `0.1-draft`.

## Stack

- Runtime: Bun 1.4 (monorepo workspaces `apps/*`, `packages/*`)
- Web: React 19 + Vite PWA (`apps/web`)
- API: Hono + Drizzle (`apps/api`)
- Infra: PostgreSQL 16 (Docker)
- Shared: Zod contracts (`packages/contracts`)
- Lint/format: oxlint + oxfmt · Tests: `bun test`

## Quickstart

Prerequisites: Bun 1.4, Git, and a container runtime (Docker or Podman).

```bash
cp .env.example .env
docker compose up -d
bun install
bun run db:migrate
bun run dev
```

URLs (dev):

- Web: <http://localhost:3000>
- API: <http://localhost:3001/health>

## Repo map

```text
.
├── apps/
│   ├── web/              # React PWA (Vite, TanStack Router/Query)
│   └── api/              # Hono REST API (Drizzle → PostgreSQL)
├── packages/
│   └── contracts/        # Zod schemas — single source of truth for API shapes
├── docs/                 # PRD, specs, ADRs, plans, guides
├── docker-compose.yml    # PostgreSQL 16
└── package.json          # Bun workspaces
```

## Documentation

Everything lives in [`docs/`](docs/README.md) — start at the
[docs index](docs/README.md). Key entry points:

- [PRD](docs/specs/PRD.md) — product vision, feature set, roadmap
- [db-schema](docs/data/db-schema.md) — canonical data model
- [DEVELOPMENT](docs/guides/DEVELOPMENT.md) — dev loop and conventions
- [Plans](docs/plans/) — phased implementation plans

## License

MIT
