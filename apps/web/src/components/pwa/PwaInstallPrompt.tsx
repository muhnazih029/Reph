import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Android PWA install prompt (beforeinstallprompt). Appears only when the
// browser offers install, never when already running standalone, and stays
// hidden once dismissed (localStorage). iOS is excluded — it has no such
// event.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("reph.pwaDismissed") === "1",
  );

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred || hidden) return null;

  const dismiss = () => {
    window.localStorage.setItem("reph.pwaDismissed", "1");
    setHidden(true);
  };

  const install = () => {
    void deferred.prompt().then(() => {
      setDeferred(null);
      setHidden(true);
      window.localStorage.setItem("reph.pwaDismissed", "1");
    });
  };

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-2xl px-4 md:bottom-4"
    >
      <div className="flex items-center gap-3 rounded-radius border border-border bg-surface px-4 py-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("pwa.installTitle")}</p>
          <p className="text-xs text-text-muted">{t("pwa.installBody")}</p>
        </div>
        <button
          type="button"
          className="min-h-9 shrink-0 rounded-sm bg-accent px-3 text-sm font-medium text-white"
          onClick={install}
        >
          {t("pwa.install")}
        </button>
        <button
          type="button"
          aria-label={t("common.cancel")}
          className="min-h-9 w-9 shrink-0 text-text-muted"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
