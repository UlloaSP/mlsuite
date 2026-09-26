/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppEyebrow({ children, className }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cx(
        "text-2xs font-semibold uppercase tracking-[0.28em] text-fg-secondary",
        className,
      )}
    >
      {children}
    </p>
  );
}
