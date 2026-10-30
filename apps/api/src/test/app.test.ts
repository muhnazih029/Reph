import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { apiErrorSchema } from "@reph/contracts";
import { AUTH_HEADER, createHarness, type Harness } from "./harness";

// Boundary tests — auth seam, health probe, error envelope, 404 shape.

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(() => h.close());

describe("health", () => {
  it("reports ok without auth", async () => {
    const res = await h.app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; db: string; version: string };
    expect(body.status).toBe("ok");
    expect(body.db).toBe("up");
    expect(body.version).toBeTypeOf("string");
  });
});

describe("auth", () => {
  it("rejects a missing token with the documented envelope", async () => {
    const res = await h.app.request("/api/v1/exercises");
    expect(res.status).toBe(401);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("unauthorized");
  });

  it("rejects a wrong token", async () => {
    const res = await h.app.request("/api/v1/exercises", {
      headers: { authorization: "Bearer nope" },
    });
    expect(res.status).toBe(401);
  });

  it("passes with the correct token", async () => {
    const res = await h.get("/exercises");
    expect(res.status).toBe(200);
  });
});

describe("routing", () => {
  it("renders not-found as the envelope, not Hono's default text", async () => {
    const res = await h.get("/nonexistent");
    expect(res.status).toBe(404);
    const payload = apiErrorSchema.parse(await res.json());
    expect(payload.error.code).toBe("not_found");
    void AUTH_HEADER; // referenced so the export stays live in this file too
  });
});
