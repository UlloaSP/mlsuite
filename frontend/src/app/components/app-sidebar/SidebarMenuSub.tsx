/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";
import { useSidebar } from "./SidebarContext";

export function SidebarMenuSub({ children, className, ...props }: ComponentProps<"ul">) {
  const { state } = useSidebar();

  if (state === "collapsed") {
    return null;
  }

  return (
    <ul
      className={cx(
        "ml-5 mt-1 grid gap-1 border-l border-[var(--border-soft)] pl-2 transition-[opacity,transform] duration-150 ease-out",
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  );
}
