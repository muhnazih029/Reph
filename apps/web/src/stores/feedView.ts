import { create } from "zustand";

// Feed view preference — how the home feed lays its cards out: a grid of
// square tiles (Instagram-like) or a compact list. The column count only
// applies on wide screens; a phone always shows one column.

const KEY = "reph.feedView";

export type FeedView = "grid" | "list";

type FeedViewState = {
  view: FeedView;
  columns: number;
  setView: (view: FeedView) => void;
  setColumns: (columns: number) => void;
};

function read(): { view: FeedView; columns: number } {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { view: "grid", columns: 3 };
    const parsed = JSON.parse(raw) as { view?: string; columns?: number };
    return {
      view: parsed.view === "list" ? "list" : "grid",
      columns:
        typeof parsed.columns === "number" && parsed.columns >= 2 && parsed.columns <= 4
          ? parsed.columns
          : 3,
    };
  } catch {
    return { view: "grid", columns: 3 };
  }
}

function write(state: { view: FeedView; columns: number }): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode — the choice lasts for this page load only.
  }
}

export const useFeedViewStore = create<FeedViewState>((set, get) => ({
  ...read(),
  setView: (view) => {
    set({ view });
    write({ view, columns: get().columns });
  },
  setColumns: (columns) => {
    set({ columns });
    write({ view: get().view, columns });
  },
}));
