/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Where the section's facts come from, or how far to trust them. */
  note?: ReactNode;
  children: ReactNode;
};

/** A titled group of facts on the model page; it draws no box of its own. */
export function ModelSection({ title, note, children }: Props) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {note ? <p className="mt-1 max-w-[70ch] text-xs leading-5 text-fg-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
