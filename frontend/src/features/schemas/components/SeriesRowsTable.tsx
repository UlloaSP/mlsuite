/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  formatSeriesCell,
  type SeriesColumn,
} from "@/capabilities/prediction-runtime/data/input-display";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

type Props = {
  label: string;
  columns: readonly SeriesColumn[];
  rows: readonly unknown[];
};

/** A series field's stored rows, one line each, under its columns' labels. */
export function SeriesRowsTable({ label, columns, rows }: Props) {
  return (
    <div className="mt-1 overflow-x-auto">
      <table aria-label={label} className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th key={column.id} className="py-1.5 pr-4 text-xs font-semibold text-fg-muted">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-line last:border-b-0">
              {columns.map((column) => (
                <td key={column.id} className="py-1.5 pr-4 font-mono tabular-nums text-fg">
                  {formatSeriesCell(isRecord(row) ? row[column.id] : undefined, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
