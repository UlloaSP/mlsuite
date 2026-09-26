/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { cx } from "./cx";

const TONES = {
  neutral: "border-line bg-surface-muted text-fg-secondary",
  accent: "border-transparent bg-accent-subtle text-accent-strong",
  success: "border-transparent bg-success-subtle text-success-fg",
  warning: "border-transparent bg-warning-subtle text-warning-fg",
  danger: "border-transparent bg-danger-subtle text-danger-fg",
};

export function AppBadge({
  children,
  tone = "neutral",
  className,
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
