import type { ReactNode } from "react";
import { AppPanel } from "@/shared/ui/AppPanel";
import { cx } from "@/shared/ui/cx";

export function AdminStatCard({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cx("min-h-[128px] rounded-2xl p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-7">
          <p className="text-sm font-medium text-fg-secondary">{label}</p>
          <div>
            <p className="text-2xl font-semibold tracking-[-0.03em] text-fg">{value}</p>
            {detail ? <p className="mt-2 text-xs text-fg-secondary">{detail}</p> : null}
          </div>
        </div>
        <div className="text-fg-secondary">{icon}</div>
      </div>
    </AppPanel>
  );
}
