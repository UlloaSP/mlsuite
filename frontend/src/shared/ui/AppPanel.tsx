/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppPanel({
  children,
  className,
  variant = "panel",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "flat" | "panel" | "catalog" }) {
  return (
    <div
      className={cx(
        "text-fg",
        variant === "panel"
          ? "rounded border border-line bg-surface-subtle p-5 shadow-card"
          : variant === "catalog"
            ? "rounded border border-line bg-surface p-4"
            : "bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
