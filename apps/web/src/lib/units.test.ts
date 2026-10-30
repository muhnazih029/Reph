import { describe, expect, it } from "bun:test";
import { displayWeight, kgToLb, kmToMi, lbToKg, miToKm } from "./units";

describe("unit conversion", () => {
  it("converts kg ↔ lb", () => {
    expect(kgToLb(100)).toBeCloseTo(100 * 2.20462, 6);
    expect(lbToKg(220.462)).toBeCloseTo(100, 6);
  });

  it("converts km ↔ mi", () => {
    expect(kmToMi(10)).toBeCloseTo(10 * 0.621371, 6);
    expect(miToKm(6.21371)).toBeCloseTo(10, 6);
  });
});

describe("displayWeight", () => {
  it("formats kg without decimals for whole values", () => {
    expect(displayWeight(80, "kg")).toBe("80 kg");
  });

  it("formats lb with one decimal", () => {
    expect(displayWeight(80, "lbs")).toBe("176.4 lb");
  });

  it("renders null as a dash", () => {
    expect(displayWeight(null, "kg")).toBe("–");
  });

  it("keeps fractional kg readable", () => {
    expect(displayWeight(72.5, "kg")).toBe("72.5 kg");
  });
});
