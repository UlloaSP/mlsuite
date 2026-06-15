/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { MoreHorizontal } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";

export function PaginationEllipsis({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex size-9 items-center justify-center text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    >
      <MoreHorizontal size={16} />
      <span className="sr-only">More pages</span>
    </span>
  );
}
