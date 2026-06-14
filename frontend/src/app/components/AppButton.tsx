/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export function AppButton({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-strong)]",
    secondary:
      "border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
    danger:
      "bg-[var(--surface-primary)] text-[var(--danger-text)] border border-transparent hover:border-[color:var(--danger-quiet)] hover:bg-[var(--danger-quiet)]",
  };

  return (
    <button
      {...props}
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
