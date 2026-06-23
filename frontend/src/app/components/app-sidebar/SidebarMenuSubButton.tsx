/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Slot } from "radix-ui";
import { type ComponentProps } from "react";
import { cx } from "../cx";
import { FOCUS_RING } from "../focus-ring";

type SidebarMenuSubButtonProps = ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
};

export function SidebarMenuSubButton({
  asChild = false,
  children,
  className,
  isActive = false,
  ...props
}: SidebarMenuSubButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-active={isActive}
      className={cx(
        "flex min-h-8 w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition",
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
