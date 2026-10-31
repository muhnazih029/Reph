import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RestTimerBar } from "../workout/RestTimerBar";
import { TabBar } from "./TabBar";

// Root layout: content + rest-timer bar + bottom tab bar. The rest-timer
// bar (Task 9) mounts above the tab bar.

export function AppShell() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh bg-background text-text">
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <h1 className="sr-only">{t("app.name")}</h1>
        <Outlet />
      </main>
      <RestTimerBar />
      <TabBar />
    </div>
  );
}
