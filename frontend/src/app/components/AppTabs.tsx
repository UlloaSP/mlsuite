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
        "inline-flex flex-wrap items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-1 shadow-[var(--shadow-card)]",
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
              "cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium transition",
              active
                ? "bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-[var(--shadow-card)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
