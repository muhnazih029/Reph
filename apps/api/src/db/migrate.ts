import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client";

// `bun run db:migrate` — applies drizzle/ migrations to DATABASE_URL.
// Never edit generated SQL (docs/guides/DEVELOPMENT.md §6).

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required — copy .env.example to .env (repo root).");
  process.exit(1);
}

const db = createDb(url);
await migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
console.log("Migrations applied.");
process.exit(0);
