/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { FIELD_FOCUS_RING } from "./focus-ring";

export function AppTextArea({
  className,
  rows,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label
      className={cx(
        "inline-flex rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-fg-secondary transition",
        FIELD_FOCUS_RING,
        className,
      )}
    >
      <textarea
        {...props}
        rows={rows}
        className={cx(
          "w-full resize-y bg-transparent text-sm leading-6 text-fg outline-none placeholder:text-fg-muted",
          rows === undefined ? "min-h-24" : "min-h-0",
        )}
      />
    </label>
  );
}
