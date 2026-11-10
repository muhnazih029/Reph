import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

// Centred confirmation dialog — for destructive, irreversible actions
// ("Discard workout"). A bottom sheet would slide over the workout the
// user is about to lose; a centred modal states the consequence plainly
// and asks for an explicit answer (DESIGN.md §3).

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex w-full max-w-sm flex-col gap-3 rounded-radius border border-border bg-surface p-5"
      >
        <h2 className="text-base font-medium text-text">{title}</h2>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
        {children}
        <div className="mt-1 flex gap-2">
          <Button
            ref={cancelRef}
            variant="secondary"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
