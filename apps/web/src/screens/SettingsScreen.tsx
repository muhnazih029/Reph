import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/Card";

// Placeholder — real settings (units/theme/language controls) land in Task 11.

export function SettingsScreen() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="settings-title">
      <h2 id="settings-title" className="mb-4 text-xl font-medium">
        {t("settings.title")}
      </h2>
      <Card>
        <p className="p-4 text-sm text-text-muted">{t("app.name")}</p>
      </Card>
    </section>
  );
}
