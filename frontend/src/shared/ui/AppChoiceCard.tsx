/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

type AppChoiceCardProps = {
  checked: boolean;
  children: ReactNode;
  className?: string;
  label: string;
  name: string;
  onChange: () => void;
  value: string;
};

export function AppChoiceCard({
  checked,
  children,
  className,
  label,
  name,
  onChange,
  value,
}: AppChoiceCardProps) {
  return (
    <label className={cx("group relative block cursor-pointer", className)}>
      <input
        type="radio"
        className="peer sr-only"
        checked={checked}
        name={name}
        value={value}
        onChange={onChange}
      />
      <span className="flex h-full min-h-32 flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-3 transition duration-200 group-hover:border-[var(--border-strong)] group-hover:bg-[var(--surface-primary)] peer-checked:border-[var(--accent-primary)] peer-checked:ring-1 peer-checked:ring-[var(--accent-primary)] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface-primary)]">
        <span className="flex min-h-0 flex-1 items-center justify-center">{children}</span>
        <span className="mt-3 flex items-center justify-between gap-3 px-1">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
          <span
            aria-hidden="true"
            className={cx(
              "flex size-5 items-center justify-center rounded-full border transition",
              checked
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                : "border-[var(--border-strong)] text-transparent",
            )}
          >
            <Check size={12} strokeWidth={3} />
          </span>
        </span>
      </span>
    </label>
  );
}
