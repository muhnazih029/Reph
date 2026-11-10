import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Bottom sheet (pickers, filters) — portal, backdrop dismiss, ESC close,
// focus restoration (DESIGN.md §3, PRD-FE §5).

export function Sheet({
  open,
  onOpenChange,
  title,
  header,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Custom header block — replaces the default title heading. */
  header?: ReactNode;
  children: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener.current?.focus();
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-radius-lg border-t border-border bg-surface pb-8 md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[80dvh] md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-radius-lg md:border"
      >
        {/* Sticky header — full-bleed so scrolled content never shows
            through the drag handle, the title or the search field. */}
        <div className="sticky top-0 z-20 bg-surface px-4 pt-3 pb-2">
          <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
          {header ? header : title ? <h2 className="mb-3 text-base font-medium">{title}</h2> : null}
        </div>
        <div className="px-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
