/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ButtonHTMLAttributes } from "react";
import { cx } from "../cx";

export function PaginationLink({
  className,
  isActive = false,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={cx(
        "inline-flex size-9 items-center justify-center rounded text-sm font-medium transition",
        "disabled:pointer-events-none disabled:opacity-45",
        isActive
          ? "border border-[var(--text-primary)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
