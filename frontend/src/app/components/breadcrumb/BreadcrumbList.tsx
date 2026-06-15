/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { cx } from "../cx";

export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      className={cx(
        "flex min-w-0 flex-wrap items-center gap-2 break-words overflow-visible",
        className,
      )}
      {...props}
    />
  );
}
