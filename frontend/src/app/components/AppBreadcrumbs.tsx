/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronRight } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "./cx";

export type AppBreadcrumbItem = {
  label: ReactNode;
  to?: string;
};

function collapseBreadcrumbs(items: AppBreadcrumbItem[]): AppBreadcrumbItem[] {
  if (items.length <= 3) {
    return items;
  }

  return [items[0], { label: "..." }, items[items.length - 1]];
}

export function AppBreadcrumbs({
  items,
  className,
}: HTMLAttributes<HTMLElement> & {
  items: AppBreadcrumbItem[];
}) {
  const visibleItems = collapseBreadcrumbs(items);

  return (
    <nav
      className={cx("flex min-w-0 items-center gap-2 overflow-hidden text-[13px]", className)}
      aria-label="Breadcrumb"
    >
      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1;
        const key = `${index}-${item.to ?? "current"}-${String(item.label)}`;

        return (
          <div key={key} className="inline-flex min-w-0 items-center gap-2">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="truncate font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cx(
                  "truncate",
                  isLast
                    ? "font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]",
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast ? (
              <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
