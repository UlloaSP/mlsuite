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
}: HTMLAttributes<HTMLDivElement> & { variant?: "flat" | "panel" }) {
  return (
    <div
      className={cx(
        "text-[var(--text-primary)]",
        variant === "panel"
          ? "rounded border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-5 shadow-[var(--shadow-card)]"
          : "bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
