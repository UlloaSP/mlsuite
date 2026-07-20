import type { ReactNode } from "react";
import { AppBadge } from "@/shared/ui/AppBadge";

export function UserInfoBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <AppBadge className="rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
      {icon}
      <span className="truncate">{label}</span>
    </AppBadge>
  );
}
