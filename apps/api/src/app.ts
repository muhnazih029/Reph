import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { DrizzleDb } from "./db/client";
import type { ApiEnv } from "./env";
import { createAuthMiddleware } from "./lib/auth";
import { ApiError, errorPayload } from "./lib/errors";
import { exercisesModule } from "./modules/exercises";
import { healthModule } from "./modules/health";
import { settingsModule } from "./modules/settings";
import { workoutsModule } from "./modules/workouts";

// App factory — modules are wired against an injected Drizzle instance so
// the unit tier runs on PGlite with zero TCP (docs/guides/DEVELOPMENT.md §5.2).

export interface AppDeps {
  db: DrizzleDb;
  env: Pick<ApiEnv, "rephApiToken">;
}

export function createApp({ db, env }: AppDeps) {
  const app = new Hono();

  app.onError((error, context) => {
    if (error instanceof ApiError) {
      return context.json(errorPayload(error), error.status as ContentfulStatusCode);
    }
    console.error(error); // unknown — log, never leak message (docs/specs/PRD-API.md §2)
    return context.json(
      { error: { code: "internal" as const, message: "Internal server error" } },
      500,
    );
  });

  app.notFound((context) =>
    context.json({ error: { code: "not_found" as const, message: "Route not found" } }, 404),
  );

  app.route("/", healthModule({ db }));

  const api = new Hono();
  if (env.rephApiToken) {
    api.use("*", createAuthMiddleware(env.rephApiToken));
  }
  api.route("/exercises", exercisesModule({ db }));
  api.route("/workouts", workoutsModule({ db }));
  api.route("/settings", settingsModule({ db }));
  app.route("/api/v1", api);

  return app;
}
