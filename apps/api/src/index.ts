import { serve } from "bun";
import { createApp } from "./app";
import { createDb } from "./db/client";
import { parseEnv } from "./env";

const env = parseEnv();
const db = createDb(env.databaseUrl);
const app = createApp({ db, env });

serve({ port: env.port, fetch: app.fetch });
console.log(`Reph API → http://localhost:${env.port}`);
