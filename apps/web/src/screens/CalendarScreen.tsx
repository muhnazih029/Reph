import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCalendar, useStreak } from "../api/hooks";
import { EmptyState } from "../components/ui/EmptyState";

export function CalendarScreen() {
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const cal = useCalendar(year, month);
  const streak = useStreak();

  const counts = new Map((cal.data?.days ?? []).map((d) => [d.date, d.count]));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

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
    <section aria-labelledby="calendar-title" className="flex flex-col gap-3">
      <h2 id="calendar-title" className="text-xl font-medium">
        {t("calendar.title")}
      </h2>

      <div className="flex items-center justify-between">
        <button type="button" onClick={prev} className="min-h-9 min-w-9">
          ‹
        </button>
        <span className="text-sm font-medium">
          {year}-{String(month).padStart(2, "0")}
        </span>
        <button type="button" onClick={next} className="min-h-9 min-w-9">
          ›
        </button>
      </div>

      {streak.data ? (
        <div className="flex gap-4 text-sm">
          <span>
            {t("calendar.currentStreak")}: <strong>{streak.data.current}</strong>
          </span>
          <span>
            {t("calendar.longestStreak")}: <strong>{streak.data.longest}</strong>
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-text-muted">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const count = counts.get(date) ?? 0;
          const intensity =
            count === 0 ? "bg-surface-2" : count === 1 ? "bg-accent/30" : "bg-accent/70";
          return (
            <span
              key={i}
              className={`aspect-square rounded-sm ${intensity} flex items-center justify-center`}
            >
              {d}
            </span>
          );
        })}
      </div>

      {(cal.data?.days ?? []).length === 0 ? (
        <EmptyState title={t("calendar.empty")} body={t("calendar.emptyBody")} />
      ) : null}
    </section>
  );
}
