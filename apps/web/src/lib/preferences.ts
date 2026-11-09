import type { Settings } from "@reph/contracts";
import i18n from "../i18n";

// Preferences side-effects (docs/plans/phase-1-mvp.md Task 11): the theme
// class flips the CSS design tokens and i18n.changeLanguage re-renders
// every screen. Applied from the settings screen AND once on boot from
// the cached settings row (main.tsx). "system" follows prefers-color-scheme.

const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function resolveTheme(theme: Settings["theme"]): boolean {
  if (theme === "system") return media?.matches ?? true;
  return theme === "dark";
}

let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

export function applyPreferences(settings: Pick<Settings, "theme" | "language">): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveTheme(settings.theme));
  if (i18n.language !== settings.language) void i18n.changeLanguage(settings.language);

  if (settings.theme === "system" && media) {
    if (!mediaListener) {
      mediaListener = () => {
        root.classList.toggle("dark", media.matches);
      };
      media.addEventListener("change", mediaListener);
    }
  } else if (mediaListener && media) {
    media.removeEventListener("change", mediaListener);
    mediaListener = null;
  }
}
