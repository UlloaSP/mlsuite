/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export function AppTabs<TValue extends string>({
  items,
  value,
  onChange,
  className,
}: Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  items: Array<{ label: ReactNode; value: TValue }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div
      className={cx(
        "flex w-full flex-wrap items-center gap-6 border-b border-[var(--border-soft)]",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cx(
              "cursor-pointer border-b-2 px-1 py-3 text-sm font-semibold transition-colors",
              active
                ? "border-[var(--accent-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
