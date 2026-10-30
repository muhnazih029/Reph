import { useTranslation } from "react-i18next";
import { Button } from "./Button";

// Query/mutation failure state: message + retry (DESIGN.md §3, PRD-FE §4).

export function ErrorState({
  message,
  onRetry,
}: {
  message: string | undefined;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="max-w-72 text-sm text-text-muted">{message ?? t("common.loading")}</p>
      <Button variant="secondary" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
