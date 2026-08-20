/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppCopy({ children, className }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx("text-sm leading-7 text-[var(--text-secondary)]", className)}>{children}</p>
  );
}
