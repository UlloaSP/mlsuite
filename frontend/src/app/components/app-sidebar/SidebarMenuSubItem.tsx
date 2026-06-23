/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";

export function SidebarMenuSubItem({ children, className, ...props }: ComponentProps<"li">) {
  return (
    <li className={cx("min-w-0", className)} {...props}>
      {children}
    </li>
  );
}
