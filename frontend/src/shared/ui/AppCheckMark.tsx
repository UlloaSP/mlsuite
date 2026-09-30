/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check } from "lucide-react";
import { cx } from "./cx";

/**
 * The checkbox box on its own, for rows that are toggle buttons (aria-pressed).
 * A real form field should use AppCheckbox instead.
 */
export function AppCheckMark({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid size-4 shrink-0 place-items-center rounded-sm border transition",
        checked ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface",
        className,
      )}
    >
      {checked ? <Check size={12} strokeWidth={3} /> : null}
    </span>
  );
}
