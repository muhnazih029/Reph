import { describe, expect, it } from "bun:test";
import * as contracts from "./index";

// Scaffold smoke test — replaced by entities.test.ts in Phase 1 Task 2.
describe("@reph/contracts", () => {
  it("loads as a module", () => {
    expect(contracts).toBeDefined();
  });
});
