/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** The page body. Its scroll position is restored on back/forward (see use-scroll-memory). */
export function AppSurface({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-scroll-memory="page" className={cx("min-h-0 bg-surface p-6 text-fg", className)}>
      {children}
    </div>
  );
}
