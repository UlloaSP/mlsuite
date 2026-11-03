import type { ReactNode } from "react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { badgeLabel } from "@/shared/ui/badge-label";

export function UserInfoBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <AppBadge className="gap-1.5">
      {icon}
      <span className="truncate">{badgeLabel(label)}</span>
    </AppBadge>
  );
}
