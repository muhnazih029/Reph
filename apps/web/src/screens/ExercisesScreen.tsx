import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/Card";

// Placeholder — real library UI lands in Task 7.

export function ExercisesScreen() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="exercises-title">
      <h2 id="exercises-title" className="mb-4 text-xl font-medium">
        {t("exercises.title")}
      </h2>
      <Card>
        <p className="p-4 text-sm text-text-muted">{t("exercises.empty")}</p>
      </Card>
    </section>
  );
}
