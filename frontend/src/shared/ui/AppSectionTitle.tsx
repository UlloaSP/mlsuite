/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppSectionTitle({ children, className }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cx(
        "text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </h2>
  );
}
