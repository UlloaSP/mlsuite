/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "@/shared/ui/cx";
import { useSidebar } from "./SidebarContext";

export function SidebarGroupLabel({ children, className, ...props }: ComponentProps<"div">) {
  const { state } = useSidebar();

  const collapsed = state === "collapsed";

  // Kept mounted and eased in height, so expanding does not make the menu jump.
  return (
    <div
      aria-hidden={collapsed}
      className={cx(
        "overflow-hidden whitespace-nowrap px-2 text-xs font-medium text-fg-secondary transition-[height,padding,opacity] duration-200 [interpolate-size:allow-keywords]",
        collapsed ? "h-0 py-0 opacity-0" : "h-auto py-1 opacity-100 delay-150",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
