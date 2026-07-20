import type { ReactNode } from "react";

export function AppFieldLabel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
