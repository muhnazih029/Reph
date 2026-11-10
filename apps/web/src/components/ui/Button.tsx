import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// One button variant per intent (docs/guides/DESIGN.md §3).

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast font-medium",
  secondary: "bg-surface-2 text-text border border-border",
  ghost: "bg-transparent text-text-muted",
  // Destructive actions share the accent colour family (tinted surface +
  // accent text) so one accent stays the only colour in the app.
  danger: "bg-accent/15 text-accent hover:bg-accent/25",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
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
});
