/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export function AppTextField({
  className,
  prefix,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  prefix?: ReactNode;
}) {
  return (
    <label
      className={cx(
        "inline-flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {prefix}
      <input
        {...props}
        className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </label>
  );
}
