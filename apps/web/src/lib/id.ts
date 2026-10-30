/** Client-side ids for new workout entries/sets — UUIDs generated on the
 * client so nested PATCHes are idempotent (docs/specs/PRD-API.md §3). */
export function newId(): string {
  return crypto.randomUUID();
}
