/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

export type Fact = { label: string; value: ReactNode };

/** Labelled facts about a record, in the eyebrow style of detail pages. */
export function FactList({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0">
          <dt className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
            {fact.label}
          </dt>
          <dd className="mt-1 truncate text-sm text-fg">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
