---
aliases:
  - Reph Contracts
tags:
  - reph
  - specs
  - contracts
status: draft
updated: 2026-10-29
---

# Contracts (`packages/contracts`)

**Version:** 0.1-draft (2026-10-29)
**Status:** Draft — planning scope; materializes into
`packages/contracts/src/` in [Phase 1 Task 2](../plans/phase-1-mvp.md).
**Related:** [PRD-API](./PRD-API.md) §2–§4 · [db-schema](../data/db-schema.md)

Single source of truth for every shape crossing the API boundary. The
server validates requests with these schemas; the web app imports the
inferred types. **If it is not in this file, it is not on the wire.**

---

## 1. Primitives & enums

```ts
import { z } from "zod";

export const muscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "upper_arms",
  "forearms",
  "hips",
  "thighs",
  "calves",
  "waist",
  "cardio",
]);
export const equipmentSchema = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebell",
  "bodyweight",
  "band",
  "other",
]);
export const exerciseTypeSchema = z.enum(["strength", "cardio"]);
export const setTypeSchema = z.enum(["normal", "warmup", "drop", "failure"]);
export const workoutStatusSchema = z.enum(["active", "completed"]);
export const weightUnitSchema = z.enum(["kg", "lbs"]);
export const distanceUnitSchema = z.enum(["km", "mi"]);
export const themeSchema = z.enum(["dark", "light"]);
export const languageSchema = z.enum(["en", "id"]);

export const idSchema = z.string().uuid();
export const epochMsSchema = z.number().int().nonnegative();
```

## 2. Entities

```ts
export const exerciseSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(), // null = global seeded library
  name: z.string().min(1).max(80),
  muscleGroup: muscleGroupSchema,
  equipment: equipmentSchema,
  type: exerciseTypeSchema,
  isCustom: z.boolean(),
  createdAt: epochMsSchema,
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const workoutSetSchema = z.object({
  id: idSchema,
  type: setTypeSchema,
  // strength fields (null for cardio sets)
  weightKg: z.number().min(0).max(999).nullable(),
  reps: z.number().int().min(0).max(9999).nullable(),
  rpe: z.number().min(0).max(10).nullable(),
  // cardio fields (null for strength sets)
  durationSeconds: z.number().int().min(0).nullable(),
  distanceMeters: z.number().min(0).nullable(),
  calories: z.number().int().min(0).nullable(),
  done: z.boolean(),
  position: z.number().int().min(0),
});
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const workoutEntrySchema = z.object({
  id: idSchema,
  exerciseId: idSchema,
  notes: z.string().max(2000),
  supersetId: idSchema.nullable(), // entries sharing an id form a superset
  position: z.number().int().min(0),
  sets: z.array(workoutSetSchema),
});
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>;

export const workoutSchema = z.object({
  id: idSchema,
  userId: idSchema,
  title: z.string().max(120),
  notes: z.string().max(5000),
  status: workoutStatusSchema,
  startTime: epochMsSchema,
  endTime: epochMsSchema.nullable(),
  bodyWeightKg: z.number().min(0).max(999).nullable(),
  entries: z.array(workoutEntrySchema), // ordered by position
  createdAt: epochMsSchema,
  updatedAt: epochMsSchema,
});
export type Workout = z.infer<typeof workoutSchema>;

export const settingsSchema = z.object({
  userId: idSchema,
  weightUnit: weightUnitSchema, // display only — storage is always kg
  distanceUnit: distanceUnitSchema, // display only — storage is always meters
  restTimerSeconds: z.number().int().min(0).max(3600),
  theme: themeSchema,
  language: languageSchema,
  updatedAt: epochMsSchema,
});
export type Settings = z.infer<typeof settingsSchema>;
```

## 3. Request bodies

```ts
export const createExerciseRequestSchema = exerciseSchema.omit({
  id: true,
  userId: true,
  isCustom: true,
  createdAt: true,
});

export const createWorkoutRequestSchema = z.object({
  title: workoutSchema.shape.title.optional(),
});

export const updateWorkoutRequestSchema = z.object({
  expectedUpdatedAt: epochMsSchema, // 409 guard (PRD-API §2)
  title: workoutSchema.shape.title.optional(),
  notes: workoutSchema.shape.notes.optional(),
  bodyWeightKg: workoutSchema.shape.bodyWeightKg.optional(),
  entries: z.array(workoutEntrySchema).optional(), // full replace (PRD-API §3)
});

export const finishWorkoutRequestSchema = z.object({
  expectedUpdatedAt: epochMsSchema,
});

export const updateSettingsRequestSchema = settingsSchema
  .omit({
    userId: true,
    updatedAt: true,
  })
  .partial();
```

## 4. Envelope

```ts
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(["bad_request", "unauthorized", "not_found", "conflict", "internal"]),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
```

Success responses are the entity arrays/objects themselves — no
`{ data: … }` wrapper ([PRD-API](./PRD-API.md) §2).

## 5. Shared pure helpers (optional Phase 1+)

If both apps ever need the same math (today only the web app computes),
move it here: `estimate1RM` (Epley), `workoutVolumeKg`, unit
conversions. Noted as a rule, not yet implemented — YAGNI until a second
consumer appears.
