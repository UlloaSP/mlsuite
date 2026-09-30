/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LoaderCircle } from "lucide-react";
import { cx } from "./cx";

/** The in-progress icon for buttons and inline work; the surrounding text says what is running. */
export function AppSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      size={size}
      className={cx("shrink-0 animate-spin motion-reduce:animate-none", className)}
    />
  );
}
