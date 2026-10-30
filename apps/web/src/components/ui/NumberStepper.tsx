// ± around a numeric value (DESIGN.md §3).

export function NumberStepper({
  value,
  onChange,
  step = 5,
  min = 0,
  max = 3600,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <button
        type="button"
        aria-label={`−${step}`}
        onClick={() => onChange(clamp(value - step))}
        className="min-h-11 min-w-11 rounded-sm border border-border bg-surface-2 text-base"
      >
        −
      </button>
      <span className="numeric min-w-16 text-center text-base">{value}</span>
      <button
        type="button"
        aria-label={`+${step}`}
        onClick={() => onChange(clamp(value + step))}
        className="min-h-11 min-w-11 rounded-sm border border-border bg-surface-2 text-base"
      >
        +
      </button>
    </div>
  );
}
