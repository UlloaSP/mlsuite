/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "./cx";

type AppSummaryRowProps = {
  label: string;
  value: string;
  valueClass: string;
  first?: boolean;
};

/** One label/value line of a side summary panel. */
export function AppSummaryRow({ label, value, valueClass, first }: AppSummaryRowProps) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-4 py-2",
        !first && "border-t border-line",
      )}
    >
      <span className="text-xs text-fg-muted">{label}</span>
      <span className={cx("font-mono text-xs", valueClass)}>{value}</span>
    </div>
  );
}
