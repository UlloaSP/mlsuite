import type { ReactNode } from "react";

export function AdminUserFormField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-fg-secondary">{label}</span>
      {children}
    </label>
  );
}
