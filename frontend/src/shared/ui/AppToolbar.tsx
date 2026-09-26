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
          ? "border-b border-line py-3"
          : "rounded-3xl border border-line bg-surface-subtle p-4 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}
