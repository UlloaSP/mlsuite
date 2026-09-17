/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useId, type InputHTMLAttributes } from "react";
import { cx } from "@/shared/ui/cx";

export function AuthField({
  label,
  marker,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; marker: string }) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;

  return (
    <div className={cx("grid gap-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="flex items-center gap-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]"
      >
        <span aria-hidden="true" className="text-[var(--accent-primary-strong)]">
          {marker}
        </span>
        <span>{label}</span>
      </label>
      <div className="group relative border-b border-[var(--border-strong)] shadow-[inset_0_-1px_0_var(--relief-groove-shadow)] transition-colors hover:border-[var(--text-muted)] focus-within:border-[var(--accent-primary)]">
        <input
          id={fieldId}
          className="auth-field-input h-14 w-full bg-transparent px-0 text-lg font-medium tracking-[-0.015em] text-[var(--text-primary)] outline-none placeholder:font-normal placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px left-0 h-0.5 w-0 bg-[var(--accent-primary)] shadow-[0_0_10px_color-mix(in_srgb,var(--accent-primary)_55%,transparent)] transition-[width] duration-300 group-focus-within:w-full motion-reduce:transition-none"
        />
      </div>
    </div>
  );
}
