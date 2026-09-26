/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

const TONES = {
  neutral: "border-line bg-surface-muted text-fg-secondary",
  accent: "border-transparent bg-accent-subtle text-accent-strong",
  success: "border-transparent bg-success-subtle text-success-fg",
  warning: "border-transparent bg-warning-subtle text-warning-fg",
  danger: "border-transparent bg-danger-subtle text-danger-fg",
  info: "border-transparent bg-info-subtle text-info-fg",
};

// Enum values from the API ("PARTIAL_SUCCESS", "OWNER") read as sentence case.
// Short all-caps words (CPU, API) are left alone as likely acronyms.
const ENUM_VALUE = /^[A-Z][A-Z0-9]*(?:[_ ][A-Z0-9]+)*$/;

/** "PARTIAL_SUCCESS" → "Partial success"; other text is returned unchanged. */
export const enumLabel = (value: string): string => {
  if (!ENUM_VALUE.test(value) || value.length < 4) return value;
  const words = value.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const badgeLabel = (value: ReactNode): ReactNode =>
  typeof value === "string" ? enumLabel(value) : value;

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
