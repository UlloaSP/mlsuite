import type { ReactNode } from "react";
import { AppPanel, AppSectionTitle, AppTextField, cx } from "../../../app/components";

export function AdminDataPanel({
  title,
  description,
  search,
  onSearch,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  search?: string;
  onSearch?: (value: string) => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cx("rounded-[16px] p-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <AppSectionTitle>{title}</AppSectionTitle>
          {description ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onSearch ? (
            <AppTextField
              value={search ?? ""}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search…"
              className="min-w-[260px]"
            />
          ) : null}
          {actions}
        </div>
      </div>
      <div className="overflow-auto">{children}</div>
    </AppPanel>
  );
}
