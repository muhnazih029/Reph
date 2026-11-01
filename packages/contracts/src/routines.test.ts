import { describe, expect, it } from "bun:test";
import {
  createRoutineRequestSchema,
  routineSchema,
  updateRoutineRequestSchema,
} from "./index";

const now = 1_798_000_000_000;
const uuid = () => crypto.randomUUID();

const validRoutineSet = () => ({
  id: uuid(),
  position: 0,
  type: "normal" as const,
  reps: 5,
  weightKg: 80,
  durationSeconds: null,
  distanceMeters: null,
  rpe: 8,
});

const validRoutineEntry = () => ({
  id: uuid(),
  exerciseId: uuid(),
  position: 0,
  notes: "",
  supersetId: null,
  sets: [validRoutineSet()],
});

const validRoutine = () => ({
  id: uuid(),
  userId: null,
  folderId: null,
  name: "Push day",
  description: null,
  position: 0,
  entries: [validRoutineEntry()],
  createdAt: now,
  updatedAt: now,
});

describe("routineSchema", () => {
  it("parses a valid routine", () => {
    expect(routineSchema.parse(validRoutine()).name).toBe("Push day");
  });
  it("rejects empty name", () => {
    expect(() => routineSchema.parse({ ...validRoutine(), name: "" })).toThrow();
  });
  it("rejects rpe > 10", () => {
    const bad = { ...validRoutine(), entries: [{ ...validRoutineEntry(), sets: [{ ...validRoutineSet(), rpe: 11 }] }] };
    expect(() => routineSchema.parse(bad)).toThrow();
  });
});

describe("createRoutineRequestSchema", () => {
  it("accepts body with just name", () => {
    expect(createRoutineRequestSchema.parse({ name: "Push day" }).name).toBe("Push day");
  });
});

describe("updateRoutineRequestSchema", () => {
  it("requires expectedUpdatedAt", () => {
    expect(() => updateRoutineRequestSchema.parse({ name: "x" })).toThrow();
  });
  it("accepts expectedUpdatedAt + partial", () => {
    expect(updateRoutineRequestSchema.parse({ expectedUpdatedAt: now, name: "x" }).name).toBe("x");
  });
});
