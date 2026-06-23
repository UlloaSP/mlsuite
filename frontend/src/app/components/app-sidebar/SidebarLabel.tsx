/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "../cx";
import { useSidebar } from "./SidebarContext";

export function SidebarLabel({ children, className, ...props }: ComponentProps<"span">) {
  const { state } = useSidebar();

  return (
    <span
      className={cx(
        "min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out",
        state === "collapsed" ? "max-w-0 translate-x-1 opacity-0" : "max-w-48 opacity-100",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
