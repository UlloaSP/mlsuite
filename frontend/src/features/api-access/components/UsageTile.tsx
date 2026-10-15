/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** One headline number of a period, with what it counts. */
export function UsageTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5">
      <p className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      <p className="mt-1 text-2xs text-fg-secondary">{sub}</p>
    </div>
  );
}
