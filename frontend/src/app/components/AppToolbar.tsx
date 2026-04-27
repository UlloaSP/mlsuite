/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./ui";

export function AppToolbar({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-4 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
