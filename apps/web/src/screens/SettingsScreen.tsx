import type { Language, Theme, WeightUnit, DistanceUnit } from "@reph/contracts";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettings, useUpdateSettings } from "../api/hooks";
import { applyPreferences } from "../lib/preferences";
import { Card } from "../components/ui/Card";
import { NumberStepper } from "../components/ui/NumberStepper";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Skeleton } from "../components/ui/Skeleton";

// Settings — Appearance (theme), Units (weight, distance), Rest timer
// (presets + custom stepper), Language, About. Every change PUTs
// immediately (single-row settings) and takes effect at once:
// documentElement class + i18n language + rest-timer default (read fresh
// from the settings cache at start()) — Task 11.

const REST_PRESETS = [30, 60, 90, 120, 180];

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      {children}
    </div>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const update = useUpdateSettings();

  // immediate effect: theme class + app language reflect the saved row
  useEffect(() => {
    if (settings.data) applyPreferences(settings.data);
  }, [settings.data?.theme, settings.data?.language]);

  if (settings.isPending) {
    return (
      <section aria-labelledby="settings-title" className="flex flex-col gap-2">
        <h2 id="settings-title" className="text-xl font-medium">
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
        <h2 id="settings-title" className="text-xl font-medium">
          {t("settings.title")}
        </h2>
        <p className="px-1 text-sm text-text-muted">{t("common.offline")}</p>
        <ButtonRetry />
      </section>
    );
  }

  const value = settings.data;

  const put = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch);

  return (
    <section aria-labelledby="settings-title" className="flex flex-col gap-3">
      <h2 id="settings-title" className="text-xl font-medium">
        {t("settings.title")}
      </h2>

      <Card className="divide-y divide-border">
        <SettingRow label={t("settings.appearance")}>
          <SegmentedControl
            label={t("settings.theme")}
            className="w-full"
            value={value.theme}
            options={[
              { value: "light" satisfies Theme, label: t("settings.themeLight") },
              { value: "dark" satisfies Theme, label: t("settings.themeDark") },
              { value: "system" satisfies Theme, label: t("settings.themeSystem") },
            ]}
            onChange={(theme) => put({ theme })}
          />
        </SettingRow>
        <SettingRow label={t("settings.units")}>
          <SegmentedControl
            label={t("settings.weightUnit")}
            className="w-full"
            value={value.weightUnit}
            options={[
              { value: "kg" satisfies WeightUnit, label: t("settings.kg") },
              { value: "lbs" satisfies WeightUnit, label: t("settings.lbs") },
            ]}
            onChange={(weightUnit) => put({ weightUnit })}
          />
          <SegmentedControl
            label={t("settings.distanceUnit")}
            className="w-full"
            value={value.distanceUnit}
            options={[
              { value: "km" satisfies DistanceUnit, label: t("settings.km") },
              { value: "mi" satisfies DistanceUnit, label: t("settings.mi") },
            ]}
            onChange={(distanceUnit) => put({ distanceUnit })}
          />
        </SettingRow>
        <RestTimerRow
          seconds={value.restTimerSeconds}
          onChange={(restTimerSeconds) => put({ restTimerSeconds })}
        />
        <SettingRow label={t("settings.language")}>
          <SegmentedControl
            label={t("settings.language")}
            className="w-full"
            value={value.language}
            options={[
              { value: "en" satisfies Language, label: "English" },
              { value: "id" satisfies Language, label: "Bahasa Indonesia" },
            ]}
            onChange={(language) => put({ language })}
          />
        </SettingRow>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {t("settings.about")}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {t("app.name")} v{REPH_VERSION} · {t("settings.ownershipNote")}
        </p>
      </Card>
    </section>
  );
}

function RestTimerRow({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <SettingRow label={t("settings.restTimer")}>
      <div className="flex flex-wrap gap-1">
        {REST_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={seconds === preset}
            onClick={() => onChange(preset)}
            className={`min-h-9 rounded-sm border px-3 text-sm ${
              seconds === preset
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
        value={seconds}
        step={15}
        min={0}
        max={600}
        onChange={onChange}
      />
    </SettingRow>
  );
}

function ButtonRetry() {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="min-h-11 rounded-radius border border-border px-4 text-sm"
    >
      {t("common.retry")}
    </button>
  );
}
