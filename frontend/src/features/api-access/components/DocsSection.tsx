/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

/** A titled part of the API documentation. */
export function DocsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-3">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {children}
    </section>
  );
}
