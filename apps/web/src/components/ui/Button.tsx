import type { ButtonHTMLAttributes, ReactNode } from "react";

// One button variant per intent (docs/guides/DESIGN.md §3).

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast font-medium",
  secondary: "bg-surface-2 text-text border border-border",
  ghost: "bg-transparent text-text-muted",
  danger: "bg-danger text-white",
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={disabled ?? loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-radius px-4 py-2 text-sm transition-colors disabled:opacity-60 ${styles[variant]} ${className}`}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="animate-spin rounded-full border-2 border-current border-t-transparent p-1.5"
        />
      ) : (
        children
      )}
    </button>
  );
}
