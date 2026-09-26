/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

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
        "inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-transparent text-fg-muted transition hover:border-line hover:bg-surface-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
    >
      {children}
    </button>
  );
}
