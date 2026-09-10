/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

type AppToolbarProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "panel" | "flat";
};

export function AppToolbar({ children, className, variant = "panel" }: AppToolbarProps) {
  return (
    <div
      className={cx(
        "flex shrink-0 flex-wrap items-center justify-between gap-3",
        variant === "flat"
          ? "border-b border-[var(--border-soft)] py-3"
          : "rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-4 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
