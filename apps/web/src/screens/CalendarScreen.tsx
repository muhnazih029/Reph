import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useCalendar, useStreak } from "../api/hooks";
import { Card } from "../components/ui/Card";
import { Icon, type IconName } from "../components/ui/Icon";

// Calendar — the streak summary, the month grid and the colour legend from
// the pen.dev design. A workout day is tinted accent, today carries an
// accent outline, every other day sits on the neutral surface.

function MetricCard({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-radius bg-surface p-3.5 md:px-4">
      <span className="flex items-center gap-1.5">
        <Icon name={icon} size={16} className="text-text-muted" />
        <span className="numeric text-xl font-semibold">{value}</span>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.5px] text-text-muted">
        {label}
      </span>
    </div>
  );
}

function LegendSwatch({ className }: { className: string }) {
  return <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-[4px] ${className}`} />;
}

export function CalendarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const cal = useCalendar(year, month);
  const streak = useStreak();

  const counts = new Map((cal.data?.days ?? []).map((d) => [d.date, d.count]));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthWorkouts = (cal.data?.days ?? []).reduce((sum, day) => sum + day.count, 0);

  const prev = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const next = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  return (
    <section aria-labelledby="calendar-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={t("weight.back")}
          onClick={() => void router.navigate({ to: "/history" })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Icon name="arrow-left" size={16} />
        </button>
        <h2 id="calendar-title" className="text-2xl font-semibold">
          {t("calendar.title")}
        </h2>
      </div>

      <div className="flex gap-4">
        <MetricCard
          icon="target"
          value={streak.data?.current ?? 0}
          label={t("calendar.currentStreak")}
        />
        <MetricCard
          icon="award"
          value={streak.data?.longest ?? 0}
          label={t("calendar.longestStreak")}
        />
        <MetricCard icon="calendar" value={monthWorkouts} label={t("calendar.workoutsThisMonth")} />
      </div>

      <Card className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            aria-label={t("common.previous")}
            onClick={prev}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <Icon name="chevron-right" size={16} className="rotate-180" />
          </button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {new Date(year, month - 1, 1).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            aria-label={t("common.next")}
            onClick={next}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="text-[11px] text-text-muted">
              {d}
            </span>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <span key={i} className="min-h-10 md:h-20" />;
            const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const count = counts.get(date) ?? 0;
            const isToday = isCurrentMonth && d === today.getDate();
            const surface = count > 0 ? "bg-accent/15 text-text" : "bg-surface-2 text-text-muted";
            return (
              <span
                key={i}
                title={count > 0 ? t("history.setsCount", { count }) : undefined}
                className={`flex min-h-10 items-center justify-center rounded-sm text-[13px] md:h-20 ${surface} ${
                  isToday ? "ring-1 ring-inset ring-accent" : ""
                }`}
              >
                {d}
              </span>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3.5 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <LegendSwatch className="bg-accent/15" />
            {t("calendar.legendWorkoutDay")}
          </span>
          <span className="flex items-center gap-1.5">
            <LegendSwatch className="bg-surface-2 ring-1 ring-inset ring-accent" />
            {t("calendar.legendToday")}
          </span>
          <span className="flex items-center gap-1.5">
            <LegendSwatch className="bg-surface-2" />
            {t("calendar.legendNoWorkout")}
          </span>
        </div>
      </Card>
    </section>
  );
}
