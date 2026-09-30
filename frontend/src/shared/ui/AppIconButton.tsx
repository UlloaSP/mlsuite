/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

export function AppIconButton({
  children,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={type}
      className={cx(
        "inline-flex size-10 cursor-pointer items-center justify-center rounded-control text-fg-muted transition hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-45",
        FOCUS_RING,
        className,
      )}
    >
      {children}
    </button>
  );
}
