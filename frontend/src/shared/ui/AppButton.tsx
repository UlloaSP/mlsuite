/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ButtonHTMLAttributes } from "react";
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

export function AppButton({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      {...props}
      type={type}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        FOCUS_RING,
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
