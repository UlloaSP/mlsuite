/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";

export function SidebarFooter({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cx("shrink-0 p-3", className)} {...props}>
      {children}
    </div>
  );
}
