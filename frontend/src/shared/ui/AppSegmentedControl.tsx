/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CONTROL_HEIGHT } from "./control-size";
import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

/** The one segmented control: `md` sits in toolbars next to fields, `sm` in compact panels. */
export function AppSegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "sm",
}: {
  label: string;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        "inline-flex w-fit shrink-0 gap-0.5 rounded-control border border-line bg-surface-muted p-0.5",
        CONTROL_HEIGHT[size],
      )}
    >
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          disabled={option.disabled}
          className={cx(
            "cursor-pointer rounded-control font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
            size === "md" ? "px-3 text-sm" : "px-2.5 text-2xs",
            FOCUS_RING,
            value === option.value
              ? "bg-surface text-fg shadow-card"
              : "text-fg-secondary hover:text-fg",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
