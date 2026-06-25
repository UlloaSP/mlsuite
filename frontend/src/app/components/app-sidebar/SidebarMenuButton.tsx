/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Slot } from "radix-ui";
import { type ComponentProps } from "react";
import { cx } from "../cx";
import { FOCUS_RING } from "../focus-ring";
import { useSidebar } from "./SidebarContext";

type SidebarMenuButtonProps = ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  title?: string;
};

export function SidebarMenuButton({
  asChild = false,
  children,
  className,
  isActive = false,
  title,
  ...props
}: SidebarMenuButtonProps) {
  const { state } = useSidebar();
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-active={isActive}
      title={state === "collapsed" ? title : undefined}
      className={cx(
        "flex min-h-10 w-full min-w-0 cursor-pointer items-center rounded-lg text-sm font-medium transition active:scale-[0.985]",
        state === "collapsed" ? "justify-center px-0 py-2.5" : "gap-3 px-2.5 py-2.5",
        isActive
          ? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
