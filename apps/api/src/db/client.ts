import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

// Connection factory — docs/guides/DEVELOPMENT.md §2. Production runs on
// node-postgres; the unit tier injects PGlite (ADR-003), so shared code
// (seed, later modules) types against the union of both adapters.

export type DrizzleDb = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

export function createDb(databaseUrl: string): NodePgDatabase<typeof schema> {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  return drizzle(pool, { schema });
}
