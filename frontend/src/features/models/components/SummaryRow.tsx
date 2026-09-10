/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "@/shared/ui/cx";

type SummaryRowProps = {
  label: string;
  value: string;
  valueClass: string;
  first?: boolean;
};

export function SummaryRow({ label, value, valueClass, first }: SummaryRowProps) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-4 py-[7px]",
        !first && "border-t border-[var(--border-soft)]",
      )}
    >
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className={cx("font-mono text-[12px]", valueClass)}>{value}</span>
    </div>
  );
}
