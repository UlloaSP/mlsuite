/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

/** A titled box of the usage view. */
export function UsageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="grid content-start gap-3 rounded-card border border-line bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}
