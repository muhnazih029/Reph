---
aliases:
  - Design Guide
tags:
  - reph
  - guide
  - design
status: draft
updated: 2026-10-29
---

# Design Guide

**Status:** Draft
**Related:** [PRD-FE](../specs/PRD-FE.md) · [DEVELOPMENT](./DEVELOPMENT.md)

The contract for how Reph looks and behaves. Source of truth for tokens
(`apps/web/src/app.css`) — this file explains them; it does not duplicate
values that the code defines.

---

## 1. Principles

1. **Mobile-first, one thumb.** Primary actions live in the lower 40 % of
   the screen; every interactive target ≥ 44 px.
2. **Data is the decoration.** No stock imagery, no gradients on content
   surfaces. Weight numbers, PRs, and charts are the visual interest.
3. **Dark by default.** The gym is dim and AMOLED phones exist; light
   theme must be equally deliberate, not an inverted afterthought.
4. **Instant-feeling.** Optimistic UI for logging (input never waits on
   a round-trip); skeletons for first load; no spinners under 300 ms.
5. **Consistent over clever.** One button variant per intent, one card
   elevation, one transition language.

## 2. Tokens

Defined once in `app.css` as CSS variables + Tailwind v4 `@theme`:

| Group  | Tokens                                                                                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color  | `background`, `surface`, `surface-2`, `border`, `text`, `text-muted`, `accent` (single brand hue), `success`, `danger`, `warning` — light/dark values on `:root` / `.dark` |
| Space  | 4-pt scale (`--space-1 … --space-12`), used via Tailwind spacing utilities only                                                                                            |
| Radius | `--radius-sm` (inputs), `--radius` (cards), `--radius-lg` (sheets/modals)                                                                                                  |
| Type   | system-first stack with `Inter` variable first; sizes `xs–3xl`; **weights 400/500/650 only**                                                                               |
| Motion | `--duration-fast: 120ms`, `--duration: 200ms`; easing `cubic-bezier(.2,.8,.2,1)`; respects `prefers-reduced-motion`                                                        |

Rules:

- Weights/times render with `font-variant-numeric: tabular-nums`
  (class `numeric`).
- Exactly **one** accent color is used for interactive emphasis; green
  scale for "done"/positive deltas, red for destructive only.
- Elevation = `border` + subtle surface shift — **no drop shadows**
  except floating sheets/timer bar.

## 3. Components (`src/components/ui`)

| Component          | Intent                                                           | Notes                                                   |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------- |
| `Button`           | `primary` (accent, one per view), `secondary`, `ghost`, `danger` | loading state = spinner in place, width preserved       |
| `Input`            | text/numeric fields                                              | numeric variant sets `inputMode`, shows `numeric` class |
| `Sheet`            | bottom sheet (pickers, filters)                                  | portal, drag handle, backdrop dismiss, focus trap       |
| `SegmentedControl` | 2–4 exclusive options                                            | settings (units, theme, language)                       |
| `NumberStepper`    | ± around a numeric value                                         | rest-timer duration, quick adjustments                  |
| `Card`             | list/stat container                                              | flat with border; used everywhere stats appear          |
| `EmptyState`       | first-run / no results                                           | title + body + at most one action                       |
| `ErrorState`       | query/mutation failure                                           | message + Retry                                         |

Domain components (`workout/`, `exercise/`) compose only these — no
ad-hoc buttons or inputs inside screens.

## 4. Screen states

Every data-driven view implements all four:

1. **Loading** — skeleton matching final layout (never a bare spinner).
2. **Empty** — `EmptyState` with a constructive action.
3. **Error** — `ErrorState`; offline gets a persistent banner instead
   ([PRD-FE §4](../specs/PRD-FE.md)).
4. **Loaded** — the view.

## 5. i18n

- react-i18next, namespaces per screen (`today.*`, `workout.*`,
  `history.*`, `exercises.*`, `settings.*`, `common.*`).
- `en` is the key-of-record; `id` must define every key (checked in the
  Phase 1 release gate).
- Dates via `Intl.DateTimeFormat` with the active locale; relative times
  ("3 days ago") through `date-fns/formatRelative` + locale.
- Interpolation for numbers (`{{count}}`) — never string concatenation.
- Copy style: sentence case, verbs first ("Start workout"), no jargon in
  primary actions; units always attached ("80 kg", "12 km").

## 6. Accessibility

- Contrast: AA (4.5:1 body, 3:1 large text) in **both** themes — verify
  when changing tokens.
- Focus: visible ring on all interactive elements; sheets trap focus and
  restore it on close.
- Targets: 44 × 44 px minimum; 8 px minimum gap between adjacent
  destructive/primary actions.
- Live regions: rest-timer completion announces via `aria-live="polite"`.
- All icon-only buttons carry `aria-label`.
