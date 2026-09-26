/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { type ComponentProps } from "react";
import { cx } from "@/shared/ui/cx";
import { useSidebar } from "./SidebarContext";

export function SidebarLabel({ children, className, ...props }: ComponentProps<"span">) {
  const { state } = useSidebar();

  return (
    <span
      className={cx(
        "min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out",
        // Labels fade in once the sidebar has widened, so they never show clipped ("Ac…").
        state === "collapsed"
          ? "max-w-0 translate-x-1 opacity-0"
          : "max-w-48 opacity-100 delay-150",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
