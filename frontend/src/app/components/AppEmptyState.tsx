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
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <AppPanel
      className={cx(
        "flex min-h-[260px] flex-col items-center justify-center gap-4 border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-primary)]">
          {icon}
        </div>
      ) : null}
      <AppSectionTitle className="text-2xl">{title}</AppSectionTitle>
      <AppCopy className="max-w-xl">{description}</AppCopy>
      {action ? <div className="pt-2">{action}</div> : null}
    </AppPanel>
  );
}
