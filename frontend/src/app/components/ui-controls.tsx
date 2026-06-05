/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cx } from "./ui-utils";

export function AppBadge({
  children,
  tone = "neutral",
  className,
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
    accent: "border-transparent bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]",
    success: "border-transparent bg-[var(--success-quiet)] text-[var(--success-text)]",
    warning: "border-transparent bg-[var(--warning-quiet)] text-[var(--warning-text)]",
    danger: "border-transparent bg-[var(--danger-quiet)] text-[var(--danger-text)]",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AppButton({
  children,
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-[var(--accent-primary)] text-[var(--text-inverse)] hover:bg-[var(--accent-primary-strong)]",
    secondary:
      "border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
    danger:
      "bg-[var(--surface-primary)] text-[var(--danger-text)] border border-transparent hover:border-[color:var(--danger-quiet)] hover:bg-[var(--danger-quiet)]",
  };
  return (
    <button
      {...props}
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

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
        "inline-flex size-10 items-center justify-center rounded-full border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AppTextField({
  className,
  prefix,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  prefix?: ReactNode;
}) {
  return (
    <label
      className={cx(
        "inline-flex items-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {prefix}
      <input
        {...props}
        className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </label>
  );
}

export function AppTextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label
      className={cx(
        "inline-flex rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <textarea
        {...props}
        className="min-h-40 w-full resize-y bg-transparent font-mono text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </label>
  );
}

export function AppSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)] outline-none",
        className,
      )}
    >
      {children}
    </select>
  );
}
