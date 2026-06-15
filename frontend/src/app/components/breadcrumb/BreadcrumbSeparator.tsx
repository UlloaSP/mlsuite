/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cx } from "../cx";

export function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<"li">) {
  return (
    <li
      aria-hidden="true"
      className={cx("shrink-0 text-[var(--text-muted)]", className)}
      role="presentation"
      {...props}
    >
      {children ?? <ChevronRight size={14} />}
    </li>
  );
}
