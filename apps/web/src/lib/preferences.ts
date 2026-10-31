import type { Settings } from "@reph/contracts";
import i18n from "../i18n";

// Preferences side-effects (docs/plans/phase-1-mvp.md Task 11): the theme
// class flips the CSS design tokens and i18n.changeLanguage re-renders
// every screen. Applied from the settings screen AND once on boot from
// the cached settings row (main.tsx).

export function applyPreferences(settings: Pick<Settings, "theme" | "language">): void {
  const root = document.documentElement;
  root.classList.toggle("dark", settings.theme === "dark");
  if (i18n.language !== settings.language) void i18n.changeLanguage(settings.language);
}
