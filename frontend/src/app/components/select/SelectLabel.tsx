/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";

type SelectLabelProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Label>;

export function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.Label
      className={cx("px-3 pb-1.5 pt-1 text-sm text-[var(--text-secondary)]", className)}
      {...props}
    />
  );
}
