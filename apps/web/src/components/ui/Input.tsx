import { forwardRef, type InputHTMLAttributes } from "react";

// Numeric variant sets inputMode + the tabular-nums class (DESIGN.md §2).

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { numeric?: boolean }
>(function Input({ numeric, className = "", ...rest }, ref) {
  return (
    <input
      ref={ref}
      {...rest}
      inputMode={numeric ? "decimal" : rest.inputMode}
      className={`min-h-11 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none ${numeric ? "numeric" : ""} ${className}`}
    />
  );
});
