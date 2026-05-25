import type { ReactNode } from "react";
import { AppPanel } from "../../../app/components/ui";
import { cx } from "../../../app/components/ui-utils";

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
    <AppPanel className={cx("min-h-[128px] rounded-[16px] p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-7">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
          <div>
            <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {value}
            </p>
            {detail ? <p className="mt-2 text-xs text-[var(--text-secondary)]">{detail}</p> : null}
          </div>
        </div>
        <div className="text-[var(--text-secondary)]">{icon}</div>
      </div>
    </AppPanel>
  );
}
