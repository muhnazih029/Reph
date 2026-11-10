import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useWorkoutFeed } from "../../api/hooks";
import { useFeedViewStore } from "../../stores/feedView";
import { Icon } from "../ui/Icon";
import { Skeleton } from "../ui/Skeleton";
import { FeedCard } from "./FeedCard";

// The home feed — newest workouts first, one screenful at a time. The
// next page is fetched when the sentinel nears the viewport (a 600 px
// runway), so a long history never loads in one request.
//
// Layout is the reader's choice: a grid of square tiles (Instagram-like)
// or a compact list. The column count only applies from md up.

export function WorkoutFeed({ pageSize = 10 }: { pageSize?: number }) {
  const { t } = useTranslation();
  const feed = useWorkoutFeed(pageSize);
  const view = useFeedViewStore((state) => state.view);
  const columns = useFeedViewStore((state) => state.columns);
  const setView = useFeedViewStore((state) => state.setView);
  const setColumns = useFeedViewStore((state) => state.setColumns);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);

  // Clicking away closes the column popover.
  useEffect(() => {
    if (!columnsOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-feed-columns]") === null) setColumnsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColumnsOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [columnsOpen]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage]);

  const workouts = feed.data?.pages.flat() ?? [];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{t("today.recentWorkouts")}</h3>

        <div className="flex items-center gap-2">
          <div className="relative" data-feed-columns>
            <button
              type="button"
              aria-pressed={view === "grid"}
              aria-haspopup={view === "grid" ? "menu" : undefined}
              aria-expanded={view === "grid" ? columnsOpen : undefined}
              aria-label={t("today.feedGrid")}
              onClick={() => {
                setView("grid");
                setColumnsOpen((value) => !value);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-sm border transition-colors ${
                view === "grid"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-text-muted"
              }`}
            >
              <Icon name="layout-grid" size={15} />
            </button>

            {view === "grid" && columnsOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-2 hidden flex-col gap-1 rounded-radius border border-border bg-surface p-2 shadow-lg md:flex"
              >
                <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  {t("today.feedColumns")}
                </p>
                <div className="flex gap-1">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      role="menuitemradio"
                      aria-checked={columns === count}
                      onClick={() => {
                        setColumns(count);
                        setColumnsOpen(false);
                      }}
                      className={`numeric flex h-8 min-w-9 items-center justify-center rounded-sm border px-2 text-xs transition-colors ${
                        columns === count
                          ? "border-accent bg-accent/15 font-medium text-accent"
                          : "border-border text-text-muted hover:bg-surface-2"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-pressed={view === "list"}
            aria-label={t("today.feedList")}
            onClick={() => {
              setView("list");
              setColumnsOpen(false);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-sm border transition-colors ${
              view === "list"
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-text-muted"
            }`}
          >
            <Icon name="layout-list" size={15} />
          </button>
        </div>
      </div>

      {feed.isPending ? (
        <div className="feed-grid" style={{ "--feed-columns": columns } as CSSProperties}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
        </div>
      ) : (
        <div className="feed-grid" style={{ "--feed-columns": columns } as CSSProperties}>
          {workouts.map((workout) => (
            <FeedCard key={workout.id} workout={workout} variant={view} />
          ))}
        </div>
      )}

      <div ref={sentinel} aria-hidden="true" />

      {feed.isFetchingNextPage ? <Skeleton className="h-24 w-full" /> : null}
      {feed.isError ? (
        <p className="py-4 text-center text-xs text-danger">{t("common.retry")}</p>
      ) : null}
      {!feed.hasNextPage && workouts.length > 0 ? (
        <p className="py-4 text-center text-xs text-text-muted">{t("today.endOfFeed")}</p>
      ) : null}
    </section>
  );
}
