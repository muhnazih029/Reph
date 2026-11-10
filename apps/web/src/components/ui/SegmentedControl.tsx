// 2–N exclusive options — settings (units, theme, language) and filters.
//
// Two shapes: "bar" (default) is the full-width control used in settings,
// "pill" is the compact text-only control from the pen.dev design
// (32 px tall, radius 9, active item on a surface chip).

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
  variant?: "bar" | "pill";
  className?: string;
}) {
  const pill = variant === "pill";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={
        pill
          ? `flex w-full items-center gap-1 rounded-[9px] bg-surface-2 p-[3px] md:w-auto md:self-start ${className}`
          : `flex rounded-radius border border-border bg-surface-2 p-0.5 ${className}`
      }
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={
              pill
                ? `flex-1 rounded-[6px] px-3 py-1.5 text-[13px] leading-none transition-colors md:flex-none ${
                    selected
                      ? "bg-surface font-semibold text-text"
                      : "font-medium text-text-muted hover:text-text"
                  }`
                : `min-h-9 flex-1 rounded-sm px-3 text-sm transition-colors ${
                    selected ? "bg-accent font-medium text-accent-contrast" : "text-text-muted"
                  }`
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
