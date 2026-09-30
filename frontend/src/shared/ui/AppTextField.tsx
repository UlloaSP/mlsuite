/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InputHTMLAttributes, ReactNode } from "react";
import { CONTROL_HEIGHT } from "./control-size";
import { cx } from "./cx";
import { FIELD_FOCUS_RING } from "./focus-ring";

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
        "inline-flex items-center gap-3 rounded-control border border-line bg-surface px-3 text-sm text-fg-secondary transition",
        CONTROL_HEIGHT.md,
        FIELD_FOCUS_RING,
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
