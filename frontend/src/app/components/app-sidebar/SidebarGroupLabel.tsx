/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";
import { useSidebar } from "./SidebarContext";

export function SidebarGroupLabel({ children, className, ...props }: ComponentProps<"div">) {
  const { state } = useSidebar();

  if (state === "collapsed") {
    return null;
  }

  return (
    <div
      className={cx("px-2 py-1 text-xs font-medium text-[var(--text-secondary)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
