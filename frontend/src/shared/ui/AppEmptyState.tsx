/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes, ReactNode } from "react";
import { AppCopy } from "./AppCopy";
import { AppPanel } from "./AppPanel";
import { AppSectionTitle } from "./AppSectionTitle";
import { cx } from "./cx";

export function AppEmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact = false,
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  /** For an empty list or panel inside a page, rather than an empty page. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cx(
          "flex flex-col items-center justify-center gap-1 px-5 py-8 text-center",
          className,
        )}
      >
        {icon ? <div className="mb-2 text-fg-muted">{icon}</div> : null}
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description ? <p className="max-w-md text-sm text-fg-secondary">{description}</p> : null}
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    );
  }

  return (
    <AppPanel
      className={cx(
        "flex min-h-0 flex-col items-center justify-center gap-4 border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-control bg-surface-muted text-fg">
          {icon}
        </div>
      ) : null}
      <AppSectionTitle className="text-2xl">{title}</AppSectionTitle>
      {description ? <AppCopy className="max-w-xl">{description}</AppCopy> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </AppPanel>
  );
}
