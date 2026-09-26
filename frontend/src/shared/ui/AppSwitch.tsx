/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { cx } from "./cx";

/** A labelled on/off setting row backed by a native checkbox. */
export function AppSwitch({
  checked,
  className,
  description,
  disabled,
  label,
  onChange,
  trailing,
}: {
  checked: boolean;
  className?: string;
  description: ReactNode;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  trailing?: ReactNode;
}) {
  return (
    <label
      className={cx(
        "flex items-center justify-between gap-5",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <span>
        <span className="block text-sm font-semibold text-fg">{label}</span>
        <span className="mt-1 block text-sm text-fg-secondary">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {trailing}
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-surface after:transition-transform peer-checked:after:translate-x-5" />
      </span>
    </label>
  );
}
