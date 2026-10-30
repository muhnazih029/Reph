import type { ReactNode } from "react";
import { Button } from "./Button";

// First-run / no-results state: title + body + at most one action (DESIGN.md §3).

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <h2 className="text-base font-medium text-text">{title}</h2>
      {body ? <p className="max-w-64 text-sm text-text-muted">{body}</p> : null}
      {action}
    </div>
  );
}

export function EmptyStateAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      {label}
    </Button>
  );
}
