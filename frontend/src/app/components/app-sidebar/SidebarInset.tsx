/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";

export function SidebarInset({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cx("flex min-h-0 min-w-0 flex-1 flex-col", className)} {...props}>
      {children}
    </div>
  );
}
