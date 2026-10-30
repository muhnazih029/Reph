// 2–N exclusive options — settings (units, theme, language) and filters.

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex rounded-radius border border-border bg-surface-2 p-0.5 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-9 flex-1 rounded-sm px-3 text-sm transition-colors ${
              selected ? "bg-accent font-medium text-accent-contrast" : "text-text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
