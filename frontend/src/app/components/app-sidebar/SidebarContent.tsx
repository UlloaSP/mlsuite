/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";

export function SidebarContent({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("app-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
