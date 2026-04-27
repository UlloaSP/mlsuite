/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export const cx = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

export const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none";

export function AppPage({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("flex size-full overflow-hidden", className)}>
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function AppSurface({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "min-h-0 bg-[var(--surface-primary)] p-6 text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AppPanel({ children, className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-[24px] border p-5",
        "border-[var(--border-soft)] bg-[var(--surface-secondary)] text-[var(--text-primary)]",
        "shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AppEyebrow({ children, className }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cx(
        "text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function AppTitle({ children, className }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cx(
        "font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-5xl",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function AppSectionTitle({ children, className }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cx(
        "text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function AppCopy({ children, className }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx("text-sm leading-7 text-[var(--text-secondary)]", className)}>{children}</p>
  );
}

export function AppBadge({
  children,
  tone = "neutral",
  className,
}: HTMLAttributes<HTMLSpanElement> & {
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
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
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
