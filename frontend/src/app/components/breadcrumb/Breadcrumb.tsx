/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { cx } from "../cx";

export function Breadcrumb({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cx("relative z-20 flex min-w-0 overflow-visible text-[13px]", className)}
      {...props}
    />
  );
}
