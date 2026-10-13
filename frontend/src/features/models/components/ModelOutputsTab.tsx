/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import type { ModelOutputRow } from "@/features/models/lib/model-schema-rows";

const TH = "px-4 py-2.5 text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary";

/** One report per model output; a schema report reads an output by its position. */
export function ModelOutputsTab({ outputs }: { outputs: ModelOutputRow[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-subtle">
            <th className={TH}>Report</th>
            <th className={TH}>Kind</th>
            <th className={TH}>Output</th>
            <th className={TH}>Target</th>
            <th className={TH}>Classes</th>
          </tr>
        </thead>
        <tbody>
          {outputs.map((output) => (
            <tr key={output.position} className="border-b border-line align-top last:border-b-0">
              <td className="px-4 py-3 font-medium text-fg">{output.label}</td>
              <td className="px-4 py-3">
                <AppBadge>{output.kind}</AppBadge>
              </td>
              <td className="px-4 py-3 font-mono text-xs leading-5 text-fg-secondary">
                {output.position}
              </td>
              <td className="px-4 py-3 text-fg-secondary">{output.targetName ?? "—"}</td>
              <td className="px-4 py-3">
                {output.classes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {output.classes.map((label) => (
                      <AppBadge key={label}>{label}</AppBadge>
                    ))}
                  </div>
                ) : (
                  <span className="text-fg-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
