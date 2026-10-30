import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/Card";

// Placeholder — real history (month groups) lands in Task 10.

export function HistoryScreen() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title" className="mb-4 text-xl font-medium">
        {t("history.title")}
      </h2>
      <Card>
        <p className="p-4 text-sm text-text-muted">{t("history.empty")}</p>
      </Card>
    </section>
  );
}
