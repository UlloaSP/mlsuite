/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AppBadge({
  children,
  tone = "neutral",
  className,
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
    accent: "border-transparent bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]",
    success: "border-transparent bg-[var(--success-quiet)] text-[var(--success-text)]",
    warning: "border-transparent bg-[var(--warning-quiet)] text-[var(--warning-text)]",
    danger: "border-transparent bg-[var(--danger-quiet)] text-[var(--danger-text)]",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
