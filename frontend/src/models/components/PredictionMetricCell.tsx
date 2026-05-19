/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type PredictionMetricCellProps = {
  label?: string;
  value: string;
  muted?: boolean;
};

export function PredictionMetricCell({ label, value, muted = false }: PredictionMetricCellProps) {
  return (
    <div className="space-y-1">
      {label ? (
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      ) : null}
      <p
        className={
          muted
            ? "text-sm text-[var(--text-secondary)]"
            : "text-sm font-medium text-[var(--text-primary)]"
        }
      >
        {value}
      </p>
    </div>
  );
}
