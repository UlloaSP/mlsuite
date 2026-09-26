/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

export function AppSegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5"
    >
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          className={cx(
            "rounded-md px-2.5 py-1 text-2xs font-medium transition",
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
