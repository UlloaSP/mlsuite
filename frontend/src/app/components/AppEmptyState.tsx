/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes, ReactNode } from "react";
import { AppCopy, AppPanel, AppSectionTitle, cx } from "./ui";

export function AppEmptyState({
  title,
  description,
  action,
  className,
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <AppPanel
      className={cx(
        "flex min-h-[260px] flex-col items-center justify-center gap-4 border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <AppSectionTitle className="text-2xl">{title}</AppSectionTitle>
      <AppCopy className="max-w-xl">{description}</AppCopy>
      {action ? <div className="pt-2">{action}</div> : null}
    </AppPanel>
  );
}
