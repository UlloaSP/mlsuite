/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Slot } from "radix-ui";
import { type ComponentProps } from "react";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
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
          ? "bg-accent-subtle text-accent-strong"
          : "text-fg-secondary hover:bg-surface-muted hover:text-fg",
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
