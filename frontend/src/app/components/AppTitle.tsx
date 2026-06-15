/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppTitle({ children, className }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cx(
        "font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-5xl",
        className,
      )}
    >
      {children}
    </h1>
  );
}
