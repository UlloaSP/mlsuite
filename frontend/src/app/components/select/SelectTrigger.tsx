/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { type ComponentPropsWithoutRef } from "react";
import { cx } from "../cx";
import { FOCUS_RING } from "../focus-ring";

type SelectTriggerProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>;

export function SelectTrigger({ children, className, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cx(
        "inline-flex h-10 min-w-0 items-center justify-between gap-2 rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-0 text-sm text-[var(--text-primary)] shadow-none transition hover:border-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45",
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={16} className="shrink-0 text-[var(--text-muted)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}
