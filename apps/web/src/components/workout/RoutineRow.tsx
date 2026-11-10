import { useTranslation } from "react-i18next";
import { formatDistanceToNowStrict } from "date-fns";
import type { Routine, Workout } from "@reph/contracts";
import { Icon } from "../ui/Icon";
import { Card } from "../ui/Card";

// Routine row — the pen.dev design: the routine name, a meta line
// ("6 exercises · 18 sets · Last: 2 days ago") and a Start action in
// the accent colour. Deleting a routine lives in the routine editor
// (⋯ → Delete routine), so there is no delete button in the list.

export function RoutineRow({
  routine,
  lastWorkout,
  onOpen,
  onStart,
  startLabel,
}: {
  routine: Routine;
  lastWorkout?: Workout;
  onOpen: () => void;
  onStart: () => void;
  startLabel: string;
}) {
  const { t } = useTranslation();
  const exercises = routine.entries.length;
  const sets = routine.entries.reduce((sum, entry) => sum + entry.sets.length, 0);

  const meta = [
    `${exercises} ${t("routines.exercises")}`,
    `${sets} ${t("today.weekSets").toLowerCase()}`,
    lastWorkout
      ? `${t("routines.last")} ${formatDistanceToNowStrict(new Date(lastWorkout.startTime), { addSuffix: true })}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="flex items-center gap-3 p-3">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-semibold">{routine.name}</span>
        <span className="block text-xs text-text-muted">{meta}</span>
      </button>
      <button
        type="button"
        onClick={onStart}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm bg-accent/15 px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/25"
      >
        <Icon name="play" size={12} />
        {startLabel}
      </button>
    </Card>
  );
}
