# Reph

A self-hosted workout tracking web app. Log workouts, track exercises, body weight, progress photos, and personal records — all on your own server.

## Features

- **Workout logging** — sets, reps, weight, RPE, rest timer, supersets, notes
- **Exercise library** — seeded library + custom exercises with muscle group & equipment filters
- **Routines / templates** — reusable workout templates
- **History & insights** — monthly grouping, weight trend charts, volume by muscle group, strength trends, calendar streaks, year-in-review
- **Progress photos** — upload & compare
- **Body weight tracking** — chart + delta
- **Personal records** — Epley-based 1RM tracking
- **PWA** — installable, offline-capable
- **i18n** — English & Indonesian
- **Self-hosted** — single owner account per instance

## Tech stack

- **Web:** React 19, TanStack Router, Vite, Tailwind v4, react-i18next
- **API:** Hono, Drizzle ORM, PostgreSQL
- **Shared:** Zod contracts (`@reph/contracts`)
- **Runtime:** Bun

## Quick start (local dev)

```bash
# 1. Install deps
bun install

# 2. Start Postgres
docker compose up -d

# 3. Migrate + seed
bun run db:migrate
bun run db:seed

# 4. Run dev servers
bun run dev
```

Web: http://localhost:3000 · API: http://localhost:8787

## Environment

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgres://...
```

## Deploy to your server

See [docs/guides/DEVELOPMENT.md](docs/guides/DEVELOPMENT.md) for production build & deployment notes. In short:

```bash
bun run build          # builds web + api
# serve apps/web/dist as static files
# run apps/api (bun) behind a reverse proxy (nginx/caddy)
```

Set `WEB_PORT` / `DATABASE_URL` and run migrations against the production DB before starting.

## License

Private — all rights reserved.
