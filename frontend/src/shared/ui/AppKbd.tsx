/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { cx } from "./cx";

export function AppKbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      {...props}
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-subtle px-1 text-2xs font-semibold text-fg-muted",
        className,
      )}
    />
  );
}
