/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

export function AppTextArea({
  className,
  rows,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label
      className={cx(
        "inline-flex rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <textarea
        {...props}
        rows={rows}
        className={cx(
          "w-full resize-y bg-transparent font-mono text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]",
          rows === undefined ? "min-h-40" : "min-h-0",
        )}
      />
    </label>
  );
}
