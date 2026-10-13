/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { cx } from "@/shared/ui/cx";

export type ModelFact = {
  label: string;
  value: ReactNode;
  /** Identifiers, hashes and versions read as data. */
  mono?: boolean;
};

/** Label and value lines; a fact the bundle does not state is left out by its caller. */
export function ModelFacts({ facts }: { facts: ModelFact[] }) {
  return (
    <dl className="border-b border-line">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="grid grid-cols-1 gap-x-6 gap-y-0.5 border-t border-line py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)]"
        >
          <dt className="text-sm text-fg-muted">{fact.label}</dt>
          <dd className={cx("min-w-0 break-words text-sm text-fg", fact.mono && "font-mono")}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
