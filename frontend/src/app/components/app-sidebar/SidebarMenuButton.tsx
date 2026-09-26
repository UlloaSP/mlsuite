/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { Slot } from "radix-ui";
import { type ComponentProps } from "react";
import { cx } from "@/shared/ui/cx";
import { AppTooltip } from "@/shared/ui/AppTooltip";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { navigationPositionAtom } from "@/shared/ui/sidebar-preferences";
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
  const position = useAtomValue(navigationPositionAtom);
  const Comp = asChild ? Slot.Root : "button";
  const collapsed = state === "collapsed";

  const button = (
    <Comp
      data-active={isActive}
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

  // Collapsed, the label is gone: name the control in a tooltip facing the content.
  return (
    <AppTooltip
      disabled={!collapsed || !title}
      label={title ?? ""}
      shortcut={props["aria-keyshortcuts"]}
      side={position === "right" ? "left" : "right"}
    >
      {button}
    </AppTooltip>
  );
}
