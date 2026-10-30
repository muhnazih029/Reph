import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

// Bottom tab bar — Today · History · Exercises · Settings; Phase 2 adds
// Progress as the fifth tab (docs/specs/PRD-FE.md §1). Respects the
// safe-area inset; 44 px targets; aria-current on the active tab.

const TABS = [
  { path: "/", key: "tabs.today" },
  { path: "/history", key: "tabs.history" },
  { path: "/exercises", key: "tabs.exercises" },
  { path: "/settings", key: "tabs.settings" },
] as const;

export function TabBar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active = tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
          return (
            <li key={tab.path} className="flex-1">
              <Link
                to={tab.path}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center text-xs ${
                  active ? "font-medium text-accent" : "text-text-muted"
                }`}
              >
                {t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
