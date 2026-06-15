/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MoreHorizontal } from "lucide-react";
import type { ComponentProps } from "react";
import { cx } from "../cx";

export function BreadcrumbEllipsis({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cx("flex h-5 w-5 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal size={14} />
      <span className="sr-only">More</span>
    </span>
  );
}
