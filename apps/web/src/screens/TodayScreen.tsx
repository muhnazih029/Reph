import { Card } from "../components/ui/Card";
import { useActiveWorkout, useExercises, useWorkouts, useSettings } from "../api/hooks";
import { useTranslation } from "react-i18next";

// Placeholder — the real Today screen is built in Task 11 (week summary,
// recent PRs, resume CTA). It already exercises the live query hooks.

export function TodayScreen() {
  const { t } = useTranslation();
  const active = useActiveWorkout();
  const workouts = useWorkouts(5);
  const exercises = useExercises();
  const settings = useSettings();

  return (
    <section aria-labelledby="today-title">
      <h2 id="today-title" className="mb-4 text-xl font-medium">
        {t("today.title")}
      </h2>
      <Card className="divide-y divide-border">
        <p className="p-4 text-sm text-text-muted">
          {t("today.resume")}:{" "}
          {active.isPending ? t("common.loading") : String(Boolean(active.data))}
        </p>
        <p className="p-4 text-sm text-text-muted">
          {t("tabs.exercises")}: {exercises.data?.length ?? t("common.loading")}
        </p>
        <p className="p-4 text-sm text-text-muted">
          {t("tabs.history")}: {workouts.data?.length ?? t("common.loading")}
        </p>
        <p className="p-4 text-sm text-text-muted">
          kg: {settings.data?.weightUnit ?? t("common.loading")} · {settings.data?.theme ?? ""}
        </p>
      </Card>
    </section>
  );
}
