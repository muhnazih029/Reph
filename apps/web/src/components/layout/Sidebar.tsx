import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../ui/Icon";
import { AccountMenu } from "../account/AccountMenu";

// Desktop navigation — the sidebar replaces the bottom tab bar from md
// up. Today · Workout · History; Settings lives in the account menu at
// the bottom (the pen.dev design), so the sidebar stays short.
//
// Focus mode: on the active-workout screen the sidebar steps aside, so
// the session cannot be navigated away from by accident. Elsewhere it
// stays and the floating workout bar brings the user back.

const NAV = [
  { path: "/", key: "tabs.today", icon: "house" },
  { path: "/workout", key: "tabs.workout", icon: "dumbbell" },
  { path: "/history", key: "tabs.history", icon: "history" },
] as const satisfies ReadonlyArray<{ path: string; key: string; icon: IconName }>;

export function Sidebar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname === "/workout/active") return null;

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 md:flex md:w-60">
      <Link to="/" className="flex items-center gap-2.5 px-2 py-1">
        <Icon name="dumbbell" size={22} className="text-accent" />
        <span className="text-xl font-semibold">{t("account.appName")}</span>
      </Link>

      <nav aria-label={t("app.primaryNav")} className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-radius px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-accent/15 font-semibold text-accent" : "text-text hover:bg-surface-2"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <AccountMenu />
    </aside>
  );
}
