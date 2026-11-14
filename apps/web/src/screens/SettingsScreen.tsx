import type { Language, Theme, WeightUnit, DistanceUnit } from "@reph/contracts";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettings, useUpdateSettings } from "../api/hooks";
import { applyPreferences } from "../lib/preferences";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { NumberStepper } from "../components/ui/NumberStepper";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Skeleton } from "../components/ui/Skeleton";

// Settings — Appearance (theme), Units (weight, distance), Rest timer
// (presets + custom stepper), Language, About. Every change PUTs
// immediately (single-row settings) and takes effect at once:
// documentElement class + i18n language + rest-timer default.

const REST_PRESETS = [30, 60, 90, 120, 180];

/** Thin ALL-CAPS section separator used between cards (Pen §13). */
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-1 pt-5 text-[11px] font-medium uppercase tracking-[0.5px] text-text-muted first:pt-0">
      {label}
    </p>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const update = useUpdateSettings();

  useEffect(() => {
    if (settings.data) applyPreferences(settings.data);
  }, [settings.data?.theme, settings.data?.language]);

  if (settings.isPending) {
    return (
      <section aria-labelledby="settings-title" className="flex flex-col gap-2">
        <h2 id="settings-title" className="text-2xl font-semibold">
          {t("settings.title")}
        </h2>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-16 w-full" />
        ))}
      </section>
    );
  }

  if (settings.error || !settings.data) {
    return (
      <section aria-labelledby="settings-title" className="flex flex-col gap-3">
        <h2 id="settings-title" className="text-2xl font-semibold">
          {t("settings.title")}
        </h2>
        <p className="px-1 text-sm text-text-muted">{t("common.offline")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-radius border border-border px-4 text-sm"
        >
          {t("common.retry")}
        </button>
      </section>
    );
  }

  const value = settings.data;
  const put = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);

  return (
    <section aria-labelledby="settings-title" className="flex flex-col">
      <h2 id="settings-title" className="text-2xl font-semibold">
        {t("settings.title")}
      </h2>

      {/* APPEARANCE */}
      <SectionLabel label={t("settings.appearance")} />
      <Card>
        <div
          role="radiogroup"
          aria-label={t("settings.theme")}
          className="grid grid-cols-3 divide-x divide-border"
        >
          {(
            [
              { value: "light" satisfies Theme, icon: "sun", label: t("settings.themeLight") },
              { value: "dark" satisfies Theme, icon: "moon", label: t("settings.themeDark") },
              {
                value: "system" satisfies Theme,
                icon: "monitor",
                label: t("settings.themeSystem"),
              },
            ] as const
          ).map((opt) => {
            const active = value.theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => put({ theme: opt.value })}
                className={`flex flex-col items-center gap-2 py-4 transition-colors ${
                  active ? "text-accent" : "text-text-muted hover:text-text"
                }`}
              >
                <Icon name={opt.icon} size={20} />
                <span className="text-[13px] font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* UNITS */}
      <SectionLabel label={t("settings.units")} />
      <Card className="divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[14px]">{t("settings.weightUnit")}</span>
          <SegmentedControl
            label={t("settings.weightUnit")}
            variant="pill"
            value={value.weightUnit}
            options={[
              { value: "kg" satisfies WeightUnit, label: t("settings.kg") },
              { value: "lbs" satisfies WeightUnit, label: t("settings.lbs") },
            ]}
            onChange={(weightUnit) => put({ weightUnit })}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-[14px]">{t("settings.distanceUnit")}</span>
          <SegmentedControl
            label={t("settings.distanceUnit")}
            variant="pill"
            value={value.distanceUnit}
            options={[
              { value: "km" satisfies DistanceUnit, label: t("settings.km") },
              { value: "mi" satisfies DistanceUnit, label: t("settings.mi") },
            ]}
            onChange={(distanceUnit) => put({ distanceUnit })}
          />
        </div>
      </Card>

      {/* WORKOUT */}
      <SectionLabel label={t("settings.workout")} />
      <Card className="divide-y divide-border">
        {/* Rest timer */}
        <div className="flex flex-col gap-3 px-4 py-3">
          <span className="text-[14px]">{t("settings.restTimer")}</span>
          <div className="flex flex-wrap gap-1.5">
            {REST_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={value.restTimerSeconds === preset}
                onClick={() => put({ restTimerSeconds: preset })}
                className={`min-h-9 rounded-sm border px-3 text-sm ${
                  value.restTimerSeconds === preset
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-border bg-surface-2 text-text-muted"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <NumberStepper
            label={t("settings.restTimer")}
            value={value.restTimerSeconds}
            step={15}
            min={0}
            max={600}
            onChange={(restTimerSeconds) => put({ restTimerSeconds })}
          />
        </div>
        {/* Weekly goal */}
        <div className="flex flex-col gap-3 px-4 py-3">
          <span className="text-[14px]">{t("settings.weeklyGoal")}</span>
          <NumberStepper
            label={t("settings.weeklyGoal")}
            value={value.weeklyWorkoutGoal}
            step={1}
            min={0}
            max={7}
            onChange={(weeklyWorkoutGoal) => put({ weeklyWorkoutGoal })}
          />
          <p className="text-xs text-text-muted">{t("settings.weeklyGoalHint")}</p>
        </div>
      </Card>

      {/* LANGUAGE */}
      <SectionLabel label={t("settings.language")} />
      <Card className="divide-y divide-border">
        {(
          [
            { value: "en" satisfies Language, label: "English" },
            { value: "id" satisfies Language, label: "Bahasa Indonesia" },
          ] as const
        ).map((opt) => {
          const active = value.language === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => put({ language: opt.value })}
              className="flex min-h-11 items-center gap-3 px-4 py-2 text-left text-[14px] transition-colors hover:bg-surface-2"
            >
              <span className="flex-1">{opt.label}</span>
              {active ? <Icon name="check" size={16} className="shrink-0 text-accent" /> : null}
            </button>
          );
        })}
      </Card>

      {/* ABOUT */}
      <SectionLabel label={t("settings.about")} />
      <Card className="flex items-center gap-4 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Icon name="dumbbell" size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium">{t("app.name")}</span>
          <span className="block text-[12px] text-text-muted">
            v{REPH_VERSION} · {t("settings.ownershipNote")}
          </span>
        </span>
      </Card>
    </section>
  );
}
