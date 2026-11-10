/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SkippedBulkFile } from "@/features/schemas/lib/use-bulk-job-upload";

/** The lines of the last file that were not sent, or why none of it was, each with its reason. */
export function BulkSkippedLines({ skipped }: { skipped: SkippedBulkFile }) {
  const count = new Set(skipped.lines.map((entry) => entry.line)).size;
  return (
    <section
      aria-label="Skipped lines"
      className="flex flex-col gap-2 rounded-card border border-warning-border bg-warning-subtle px-3 py-2 text-sm text-warning-fg"
    >
      <p className="font-medium">
        {skipped.fileRejected
          ? "The file was not sent"
          : `Skipped ${count} line${count === 1 ? "" : "s"} of the file`}
      </p>
      <ul className="app-scroll flex max-h-40 flex-col gap-1 overflow-y-auto">
        {skipped.lines.map((entry, index) => (
          <li key={`${entry.line}-${index}`}>
            {entry.line > 0 ? <span className="font-mono">line {entry.line}: </span> : null}
            {entry.reason}
          </li>
        ))}
      </ul>
    </section>
  );
}
