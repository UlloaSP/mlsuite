/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";

export function SidebarMenu({ children, className, ...props }: ComponentProps<"ul">) {
  return (
    <ul className={cx("grid gap-1", className)} {...props}>
      {children}
    </ul>
  );
}
