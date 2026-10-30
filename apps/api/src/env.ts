import { z } from "zod";

// Boot-time env validation — docs/guides/DEVELOPMENT.md §4.
// The app takes this parsed/camel-cased object; `process.env` is only read here.

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REPH_API_TOKEN: z.string().optional().default(""), // empty = auth disabled (local dev)
  PORT: z.coerce.number().int().positive().optional().default(3001),
});

export type ApiEnv = {
  databaseUrl: string;
  rephApiToken: string;
  port: number;
};

export function parseEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  const parsed = envSchema.parse(source);
  return {
    databaseUrl: parsed.DATABASE_URL,
    rephApiToken: parsed.REPH_API_TOKEN,
    port: parsed.PORT,
  };
}
