/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";

export function SidebarGroupContent({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cx("grid gap-1", className)} {...props}>
      {children}
    </div>
  );
}
