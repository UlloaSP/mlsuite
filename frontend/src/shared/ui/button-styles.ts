/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-strong",
  secondary:
    "border border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-hover",
  ghost: "bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg",
  danger:
    "border border-transparent bg-surface text-danger-fg hover:border-danger-border hover:bg-danger-subtle",
};

const SIZES = {
  md: "gap-2 px-4 py-3 text-sm",
  sm: "gap-1.5 px-3 py-1.5 text-xs",
};

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

/**
 * AppButton's look, for elements that must stay links (a Link styled as a
 * button) so they never nest a button inside an anchor.
 */
export const appButtonClass = ({
  size = "md",
  variant = "primary",
}: {
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}) =>
  cx(
    "inline-flex cursor-pointer items-center justify-center rounded-control font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
    FOCUS_RING,
    SIZES[size],
    VARIANTS[variant],
  );
