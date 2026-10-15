/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";

const TH = "px-4 py-2.5 text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary";

/** A small reference table inside the API documentation. */
export function BookmarkApiDocsTable({
  label,
  header,
  rows,
}: {
  label: string;
  header: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table aria-label={label} className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-subtle">
            {header.map((title) => (
              <th key={title} className={TH}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line align-top last:border-b-0">
              {row.map((value, column) => (
                <td key={header[column]} className="px-4 py-3 text-fg-secondary">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
