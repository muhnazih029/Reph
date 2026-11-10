import { Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { hasDevToken } from "../../api/client";
import { useSessionStore } from "../../stores/session";
import { RestTimerToast } from "../workout/RestTimer";
import { ActiveWorkoutBar } from "../workout/ActiveWorkoutBar";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { PwaInstallPrompt } from "../pwa/PwaInstallPrompt";
import { LoginScreen } from "../../screens/LoginScreen";

// Root layout: content + rest-timer bar + navigation. Mobile gets the
// floating tab bar; from md up the sidebar takes over and the tab bar
// hides. The rest-timer bar (Task 9) mounts above the tab bar.
//
// Gate: without a dev token the instance needs a signed-in account
// (PRD-API §2), so the shell renders the sign-in screen until then.

export function AppShell() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const devToken = hasDevToken();

  // The session token in storage is the source of truth — a query that is
  // refetching must never blank the screen (the account query flips to
  // "pending" on window focus, so its status alone is not a state).
  const signedIn = useSessionStore((state) => state.token !== null);

  if (pathname === "/login") return <LoginScreen />;
  if (!devToken && !signedIn) return <LoginScreen />;

  return (
    <div className="min-h-dvh bg-background text-text md:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-4 md:max-w-5xl md:px-8 md:pb-10 md:pt-8">
          <h1 className="sr-only">{t("app.name")}</h1>
          <Outlet />
        </main>
        {/* The rest timer floats as a toast over every screen — it never
            shifts the content (the active-workout header carries a small
            marker instead). */}
        <RestTimerToast />
        {/* A running workout keeps a floating bar, so leaving the session
            is safe: one tap brings the user back to it. */}
        <ActiveWorkoutBar />
        <PwaInstallPrompt />
      </div>
      <TabBar />
    </div>
  );
}
