/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { cx } from "@/shared/ui/cx";

type SelectContentProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
  container?: HTMLElement | null;
};

export function SelectContent({
  children,
  className,
  position,
  container,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        className={cx(
          "z-(--z-popover) max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-menu border border-line bg-surface p-2 text-fg shadow-hover",
          className,
        )}
        position={position ?? "item-aligned"}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-56 overflow-y-auto">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}
