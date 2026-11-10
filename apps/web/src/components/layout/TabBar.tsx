import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../ui/Icon";

// Bottom tab bar — Today · Workout · History · Settings. The Exercises
// library lives inside the Workout tab (Routines | Exercises segmented
// control), so it does not get its own tab. Phase 2 adds Progress as the
// fifth tab (docs/specs/PRD-FE.md §1). Floating capsule, 44 px targets,
// safe-area inset, aria-current on the active tab.
//
// Focus mode: on the active-workout screen the bar hides — leaving a
// running session by accident is what made it "stop". Elsewhere the bar
// stays; the floating workout bar brings the user back to the session.

const TABS = [
  { path: "/", key: "tabs.home", icon: "house" },
  { path: "/workout", key: "tabs.workout", icon: "dumbbell" },
  { path: "/history", key: "tabs.history", icon: "history" },
  { path: "/settings", key: "tabs.settings", icon: "settings" },
] as const satisfies ReadonlyArray<{ path: string; key: string; icon: IconName }>;

export function TabBar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname === "/workout/active") return null;

  return (
    <nav
      aria-label={t("app.primaryNav")}
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-center gap-1 rounded-full border border-border bg-surface/85 p-1.5 backdrop-blur-md">
        {TABS.map((tab) => {
          const active = tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
          return (
            <li key={tab.path} className="flex-1">
              <Link
                to={tab.path}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-[3px] rounded-[14px] px-4 py-[5px] text-[10px] font-medium transition-colors ${
                  active ? "bg-accent/15 text-accent" : "text-text-muted"
                }`}
              >
                <Icon name={tab.icon} size={20} />
                <span>{t(tab.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
