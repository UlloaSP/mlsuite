/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InputHTMLAttributes, ReactNode } from "react";
import { CONTROL_HEIGHT } from "./control-size";
import { cx } from "./cx";
import { useFieldId } from "./field-id";
import { FIELD_FOCUS_RING } from "./focus-ring";

/** A text input in the field frame; its label is its `AppFieldLabel`, or an `aria-label`. */
export function AppTextField({
  className,
  id,
  prefix,
  suffix,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  prefix?: ReactNode;
  suffix?: ReactNode;
}) {
  const fieldId = useFieldId(id);
  // A frame, not a label: the input's one label is the field's, so its name is what it shows.
  return (
    <span
      className={cx(
        "inline-flex items-center gap-3 rounded-control border border-line bg-surface px-3 text-sm text-fg-secondary transition",
        CONTROL_HEIGHT.md,
        FIELD_FOCUS_RING,
        className,
      )}
    >
      {prefix}
      <input
        {...props}
        id={fieldId}
        className="w-full self-stretch bg-transparent text-fg outline-none placeholder:text-fg-muted"
      />
      {suffix}
    </span>
  );
}
