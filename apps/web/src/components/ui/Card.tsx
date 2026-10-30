import type { ReactNode } from "react";

// Flat card with border — the one list/stat container (DESIGN.md §2/§3).

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-radius border border-border bg-surface ${className}`}>{children}</div>
  );
}
