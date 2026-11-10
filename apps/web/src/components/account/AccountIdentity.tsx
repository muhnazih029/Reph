import { useTranslation } from "react-i18next";
import type { AccountUser } from "@reph/contracts";
import { Icon, type IconName } from "../ui/Icon";

// Account identity block — the pen.dev design shows the signed-in account
// (name + email). Reph is a single-user self-hosted tracker (PRD-API §2),
// so one account owns the instance; the name comes from the account, not
// from a hardcoded string.

export function AccountIdentity({ user }: { user?: AccountUser | null }) {
  const { t } = useTranslation();
  const name = user?.name ?? t("account.appName");
  const subtitle = user?.email ?? t("account.subtitle");
  const initial = (user?.name ?? t("account.appName")).trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-base font-semibold text-accent"
      >
        {initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold">{name}</span>
        <span className="block truncate text-xs text-text-muted">{subtitle}</span>
      </span>
    </div>
  );
}

/** One row of the account panel — icon, label, value on the right. */
export function AccountRow({
  icon,
  label,
  value,
  onClick,
  chevron = false,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const content = (
    <>
      <Icon name={icon} size={16} className="shrink-0 text-text-muted" />
      <span className="text-sm font-medium">{label}</span>
      {value ? <span className="ml-auto text-sm text-text-muted">{value}</span> : null}
      {chevron ? (
        <Icon name="chevron-right" size={15} className="shrink-0 text-text-muted" />
      ) : null}
    </>
  );

  if (!onClick) {
    return <div className="flex min-h-11 items-center gap-3 px-3 py-2.5">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
    >
      {content}
    </button>
  );
}
