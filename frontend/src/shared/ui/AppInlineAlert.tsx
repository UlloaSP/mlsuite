/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { cx } from "./cx";

/** A failure shown where it happened, next to the action that can retry it. */
export function AppInlineAlert({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={cx(
        "rounded-control border border-danger-border bg-danger-subtle px-3 py-2 text-sm text-danger-fg",
        className,
      )}
    >
      {children}
    </p>
  );
}
