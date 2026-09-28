/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { CONTROL_HEIGHT } from "@/shared/ui/control-size";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

type SelectTriggerProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
  size?: "md" | "sm";
};

export function SelectTrigger({ children, className, size = "md", ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cx(
        "inline-flex min-w-0 items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 py-0 text-fg shadow-none transition hover:border-fg disabled:cursor-not-allowed disabled:opacity-45",
        CONTROL_HEIGHT[size],
        size === "sm" ? "text-xs" : "text-sm",
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={16} className="shrink-0 text-fg-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}
