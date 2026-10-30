import type { ZodType } from "zod";
import { ApiError } from "./errors";

// Boundary helpers — DB stores canonical units (kg/meters/seconds) and
// timestamptz; the wire contract uses epoch-ms numbers and JS numbers.

export function epochMs(date: Date): number {
  return date.getTime();
}

export function numericToNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export function toNumeric(value: number): string {
  return String(value);
}

/** Validate wire input with a contracts schema; Zod failure → 400 with issues. */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ApiError.badRequest("Validation failed", { issues: result.error.issues });
  }
  return result.data;
}
