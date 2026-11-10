import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useAccount, useLogout } from "../../api/hooks";
import { Icon } from "../ui/Icon";
import { AccountIdentity } from "./AccountIdentity";

// Account menu — one component, two shapes:
//   "chip"   desktop sidebar: the user chip at the bottom, menu opens up
//   "avatar" mobile header: the profile button, menu opens down under it
// Both carry the signed-in account, Settings (desktop) and Sign out.

type Variant = "chip" | "avatar";

export function AccountMenu({ variant = "chip" }: { variant?: Variant }) {
  const { t } = useTranslation();
  const router = useRouter();
  const account = useAccount();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = account.data?.name ?? t("account.appName");
  const initial = name.trim().charAt(0).toUpperCase();
  const status = account.data ? t("account.syncedNow") : t("account.devToken");

  const signOut = () => {
    setOpen(false);
    void logout.mutate();
  };

  const panel = (
    <div
      role="menu"
      className={`absolute z-50 flex flex-col gap-1 rounded-radius border border-border bg-surface p-2 ${
        variant === "chip" ? "bottom-full left-0 right-0 mb-2" : "right-0 top-full mt-2 w-60"
      }`}
    >
      <div className="px-3 py-2">
        <AccountIdentity user={account.data} />
      </div>
      <div className="h-px bg-border" />

      {variant === "chip" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            void router.navigate({ to: "/settings" });
          }}
          className="flex min-h-11 items-center gap-3 rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-2"
        >
          <Icon name="settings" size={16} className="shrink-0 text-text-muted" />
          {t("account.settings")}
        </button>
      ) : null}

      {account.data ? (
        <button
          type="button"
          role="menuitem"
          onClick={signOut}
          disabled={logout.isPending}
          className="flex min-h-11 items-center gap-3 rounded-sm bg-accent/10 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent/20 disabled:opacity-60"
        >
          <Icon name="log-out" size={16} className="shrink-0 text-accent" />
          {t("account.signOut")}
        </button>
      ) : (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            void router.navigate({ to: "/login" });
          }}
          className="flex min-h-11 items-center gap-3 rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-2"
        >
          <Icon name="user" size={16} className="shrink-0 text-text-muted" />
          {t("account.signIn")}
        </button>
      )}
    </div>
  );

  if (variant === "avatar") {
    return (
      <div ref={wrap} className="relative shrink-0 md:hidden">
        <button
          type="button"
          aria-label={t("account.title")}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent transition-colors hover:bg-accent/25"
        >
          {initial}
        </button>
        {open ? panel : null}
      </div>
    );
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center gap-3 rounded-radius border border-border bg-surface-2 px-3 py-2 text-left transition-colors hover:bg-surface-2/70"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-text-muted">{status}</span>
        </span>
        <Icon name="chevron-up" size={14} className="shrink-0 text-text-muted" />
      </button>
      {open ? panel : null}
    </div>
  );
}
