// Exercise images from yuhonas/free-exercise-db (Unlicense / public domain),
// bundled locally under /public/exercises as <slug>-0.jpg and <slug>-1.jpg.

export function exerciseImageSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function exerciseImagePath(name: string, index: 0 | 1): string {
  return `/exercises/${exerciseImageSlug(name)}-${index}.jpg`;
}
