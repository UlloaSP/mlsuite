/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes } from "react";
import { badgeLabel } from "./badge-label";
import { cx } from "./cx";

const TONES = {
  neutral: "border-line bg-surface-muted text-fg-secondary",
  accent: "border-transparent bg-accent-subtle text-accent-strong",
  success: "border-transparent bg-success-subtle text-success-fg",
  warning: "border-transparent bg-warning-subtle text-warning-fg",
  danger: "border-transparent bg-danger-subtle text-danger-fg",
  info: "border-transparent bg-info-subtle text-info-fg",
};

export function AppBadge({
  children,
  tone = "neutral",
  className,
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {badgeLabel(children)}
    </span>
  );
}
