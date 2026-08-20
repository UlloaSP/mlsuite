/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { cx } from "@/shared/ui/cx";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      {...props}
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-1 text-[0.68rem] font-semibold text-[var(--text-muted)]",
        className,
      )}
    />
  );
}
