/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";
import { normalizeSelectValue } from "./SelectContext";

type SelectItemProps = Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Item>, "value"> & {
  value: string;
};

export function SelectItem({ children, className, value, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cx(
        "relative flex w-full cursor-default select-none items-center rounded px-3 py-2.5 text-left text-sm outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-[var(--surface-muted)] data-[disabled]:opacity-45",
        className,
      )}
      value={normalizeSelectValue(value) ?? value}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
