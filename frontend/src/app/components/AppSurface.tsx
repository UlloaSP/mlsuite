/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppSurface({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "min-h-0 bg-[var(--surface-primary)] p-6 text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
