/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { cx } from "@/shared/ui/cx";

export function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      className={cx("truncate font-medium text-[var(--text-primary)]", className)}
      {...props}
    />
  );
}
