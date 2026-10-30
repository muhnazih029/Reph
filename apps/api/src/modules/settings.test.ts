import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { apiErrorSchema, settingsSchema, type Settings } from "@reph/contracts";
import { createHarness, type Harness } from "../test/harness";

// Settings — lazy default seeding on first read, partial PUT merge (§3).

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(() => h.close());

describe("GET /settings", () => {
  it("seeds and returns the defaults", async () => {
    const res = await h.get("/settings");
    expect(res.status).toBe(200);
    const parsed = settingsSchema.parse(await res.json());
    expect(parsed.weightUnit).toBe("kg");
    expect(parsed.distanceUnit).toBe("km");
    expect(parsed.restTimerSeconds).toBe(90);
    expect(parsed.theme).toBe("dark");
    expect(parsed.language).toBe("en");
  });
});

describe("PUT /settings", () => {
  it("merges a partial body and leaves untouched fields alone", async () => {
    const res = await h.send("PUT", "/settings", { restTimerSeconds: 60, theme: "light" });
    expect(res.status).toBe(200);
    const merged = settingsSchema.parse(await res.json()) as Settings;
    expect(merged.restTimerSeconds).toBe(60);
    expect(merged.theme).toBe("light");
    expect(merged.language).toBe("en"); // untouched default survives
  });

  it("rejects an invalid unit with 400", async () => {
    const res = await h.send("PUT", "/settings", { weightUnit: "stone" });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe("bad_request");
  });
});
