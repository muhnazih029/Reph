// 2–N exclusive options — settings (units, theme, language) and filters.
//
// Shapes, all from the pen.dev design: "bar" (default) is the full-width
// control used in settings, "pill" is the compact text-only control (32 px
// tall, radius 9), "view" is the History Log/Insight switch (34 px track,
// 28 px chip, 18 px side padding) and "period" is the Stats period bar
// (44 px track, radius 10, equal-width chips).

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "bar",
  className = "",
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  variant?: "bar" | "pill" | "view" | "period";
  className?: string;
}) {
  const pill = variant === "pill";
  const view = variant === "view";
  const period = variant === "period";

  const track = period
    ? `flex w-full items-center gap-[3px] rounded-[10px] bg-surface-2 p-[3px] ${className}`
    : pill || view
      ? `flex w-full items-center gap-1 rounded-[9px] bg-surface-2 p-[3px] md:w-auto md:self-start ${className}`
      : `flex rounded-radius border border-border bg-surface-2 p-0.5 ${className}`;

  const chip = (selected: boolean): string => {
    if (period) {
      return `min-h-[38px] flex-1 rounded-sm px-2.5 text-[13px] transition-colors ${
        selected
          ? "bg-surface font-semibold text-text"
          : "font-medium text-text-muted hover:text-text"
      }`;
    }
    if (view) {
      return `h-7 flex-1 rounded-[6px] px-[18px] text-xs leading-none transition-colors md:flex-none ${
        selected
          ? "bg-surface font-semibold text-text"
          : "font-medium text-text-muted hover:text-text"
      }`;
    }
    if (pill) {
      return `flex-1 rounded-[6px] px-3 py-1.5 text-[13px] leading-none transition-colors md:flex-none ${
        selected
          ? "bg-surface font-semibold text-text"
          : "font-medium text-text-muted hover:text-text"
      }`;
    }
    return `min-h-9 flex-1 rounded-sm px-3 text-sm transition-colors ${
      selected ? "bg-accent font-medium text-accent-contrast" : "text-text-muted"
    }`;
  };

  return (
    <div role="radiogroup" aria-label={label} className={track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={chip(selected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
