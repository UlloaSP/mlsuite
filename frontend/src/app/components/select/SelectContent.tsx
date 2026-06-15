/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";

type SelectContentProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Content>;

export function SelectContent({ children, className, position, ...props }: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cx(
          "z-[1000] max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 text-[var(--text-primary)] shadow-[var(--shadow-hover)]",
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
