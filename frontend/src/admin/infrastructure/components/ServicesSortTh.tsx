/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SortDir, SortKey } from "./ServicesView";

export function SortTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className="cursor-pointer select-none px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {active && <span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}
