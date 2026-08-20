/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

type ModelMetricProps = {
  icon: ReactNode;
  label: string;
  value: number;
};

export function ModelMetric({ icon, label, value }: ModelMetricProps) {
  return (
    <div className="rounded bg-[var(--surface-secondary)] px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
