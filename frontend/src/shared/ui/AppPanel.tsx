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
        "text-[var(--text-primary)]",
        variant === "panel"
          ? "rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-5 shadow-[var(--shadow-card)]"
          : variant === "catalog"
            ? "rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-4"
            : "bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
