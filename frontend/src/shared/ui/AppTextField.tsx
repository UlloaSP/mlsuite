/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export function AppTextField({
  className,
  prefix,
  suffix,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  prefix?: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <label
      className={cx(
        "inline-flex items-center gap-3 rounded border border-line bg-surface px-4 py-3 text-sm text-fg-secondary",
        className,
      )}
    >
      {prefix}
      <input
        {...props}
        className="w-full bg-transparent text-fg outline-none placeholder:text-fg-muted"
      />
      {suffix}
    </label>
  );
}
