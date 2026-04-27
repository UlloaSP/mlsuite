/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronRight } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "./ui";

export function AppBreadcrumbs({
  items,
  className,
}: HTMLAttributes<HTMLElement> & {
  items: Array<{ label: ReactNode; to?: string }>;
}) {
  return (
    <nav
      className={cx("flex flex-wrap items-center gap-2 text-sm", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="inline-flex items-center gap-2">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                }
              >
                {item.label}
              </span>
            )}
            {!isLast ? <ChevronRight size={14} className="text-[var(--text-muted)]" /> : null}
          </div>
        );
      })}
    </nav>
  );
}
