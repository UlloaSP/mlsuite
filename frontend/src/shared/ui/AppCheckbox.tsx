/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

/** A native checkbox (keyboard, forms, labels) drawn like AppCheckMark. */
export function AppCheckbox({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <span className={cx("relative inline-grid size-4 shrink-0 place-items-center", className)}>
      <input
        {...props}
        type="checkbox"
        className="peer size-4 cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface transition checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-45"
      />
      <Check
        aria-hidden="true"
        size={12}
        strokeWidth={3}
        className="pointer-events-none absolute text-on-accent opacity-0 peer-checked:opacity-100"
      />
    </span>
  );
}
