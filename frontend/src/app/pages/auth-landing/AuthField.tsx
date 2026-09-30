/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useId, type InputHTMLAttributes } from "react";

export function AuthField({
  label,
  invalid,
  errorId,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  invalid: boolean;
  errorId: string;
}) {
  const fieldId = useId();
  const input = (
    <input
      id={fieldId}
      className="auth-input"
      aria-label={label ? undefined : props.placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="auth-mono text-2xs tracking-[0.2em]">
        {label}
      </label>
      {input}
    </div>
  );
}
