/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { denormalizeSelectValue, normalizeSelectValue } from "./SelectContext";

type SelectProps = Omit<
  ComponentPropsWithoutRef<typeof SelectPrimitive.Root>,
  "defaultValue" | "onValueChange" | "value"
> & {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

export function Select({ defaultValue, onValueChange, value, ...props }: SelectProps) {
  return (
    <SelectPrimitive.Root
      defaultValue={normalizeSelectValue(defaultValue)}
      onValueChange={(nextValue) => onValueChange?.(denormalizeSelectValue(nextValue))}
      value={normalizeSelectValue(value)}
      {...props}
    />
  );
}
