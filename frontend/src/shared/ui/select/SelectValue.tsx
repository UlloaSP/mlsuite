/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";

type SelectValueProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Value>;

export function SelectValue(props: SelectValueProps) {
  return <SelectPrimitive.Value {...props} />;
}
