---
aliases:
  - Features Index
tags:
  - reph
  - features
  - moc
status: living
updated: 2026-10-29
---

# Features — Acceptance Index

One file per feature as it is built. This index is the single status
source; PRD sections stay at overview level and link here.

**Template rules** (when creating a feature file `<slug>.md`):

- Frontmatter: `aliases`, `tags: [reph, feature]`, `status` (planned |
  in-progress | built | stable), `updated`.
- Sections: **Purpose** (1 short paragraph) · **Acceptance criteria**
  (checkbox list, Given/When/Then phrasing where ambiguity is possible) ·
  **API** (endpoints used, pointer to [PRD-API](../specs/PRD-API.md)) ·
  **UI** (route/components, pointer to [PRD-FE](../specs/PRD-FE.md)) ·
  **Notes** (decisions/limitations).
- File lives in `docs/features/`, is linked from this table, and its
  criteria are checked in the release gate of the owning
  [plan](../plans/).

## Status table

| Feature                                             | Spec                               | Phase | Status      | File                                                |
| --------------------------------------------------- | ---------------------------------- | ----- | ----------- | --------------------------------------------------- |
| Workout logging (active session, sets, supersets)   | [PRD §3.1](../specs/PRD.md)        | 1     | built       | [workout-logging](workout-logging.md)               |
| Rest timer                                          | [PRD §3.1](../specs/PRD.md)        | 1     | built       | [rest-timer](rest-timer.md)                         |
| Exercise library + custom exercises                 | [PRD §3.2](../specs/PRD.md)        | 1     | built       | [exercise-library](exercise-library.md)             |
| History & workout detail (edit/delete)              | [PRD §3.3](../specs/PRD.md)        | 1     | built       | [history-workout-detail](history-workout-detail.md) |
| Stats primitives (1RM Epley, volume, weekly series) | [PRD §3.3](../specs/PRD.md)        | 1     | built       | [stats-units](stats-units.md)                       |
| Today / home                                        | [PRD §3.3](../specs/PRD.md)        | 1     | built       | [today-home](today-home.md)                         |
| Settings (units, timer, theme, language)            | [PRD §3.4](../specs/PRD.md)        | 1     | built       | [settings](settings.md)                             |
| PWA install + offline banner                        | [PRD-FE §4–§6](../specs/PRD-FE.md) | 1     | built       | [pwa-offline](pwa-offline.md)                       |
| Progress photos + compare                           | [PRD §3.5](../specs/PRD.md)        | 2     | planned     | —                                                   |
| Routines/templates + folders                        | [PRD §3.6](../specs/PRD.md)        | 2     | planned     | —                                                   |
| Calendar + streak                                   | [PRD §3.6](../specs/PRD.md)        | 2     | planned     | —                                                   |
| Programs                                            | [PRD §3.6](../specs/PRD.md)        | 2     | planned     | —                                                   |
| Body metrics + trends                               | [PRD §3.7](../specs/PRD.md)        | 3     | planned     | —                                                   |
| Stats dashboard                                     | [PRD §3.7](../specs/PRD.md)        | 3     | planned     | —                                                   |
| Year in Review                                      | [PRD §3.7](../specs/PRD.md)        | 3     | planned     | —                                                   |
| CSV import/export                                   | [PRD §3.7](../specs/PRD.md)        | 3     | planned     | —                                                   |
| Accounts & multi-user                               | [PRD §3.8](../specs/PRD.md)        | 4     | conditional | —                                                   |
