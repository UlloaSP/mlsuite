/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowRight } from "lucide-react";
import { AppPanel, AppBadge } from "../../app/components";
import { formatTimestamp, getPredictionShortId } from "../../models/utils";
import type { PredictionRunDto } from "../types";

type Props = {
  runs: PredictionRunDto[];
  onOpenRun: (runId: string) => void;
  feedbackStatusByRunId?: Map<string, "COMPLETED" | "PENDING">;
};

const tone = (status: string) =>
  status === "SUCCESS" ? "success" : status === "PARTIAL_SUCCESS" ? "warning" : "danger";

export function SchemaRunHistoryTable({
  runs,
  onOpenRun,
  feedbackStatusByRunId = new Map(),
}: Props) {
  return (
    <AppPanel className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--surface-secondary)]">
            <tr className="text-left text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <th className="px-5 py-4">Inference</th>
              <th className="px-5 py-4">Date & time</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Feedback</th>
              <th className="px-5 py-4">Models</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                className="cursor-pointer border-t border-[var(--border-soft)] text-sm transition hover:bg-[var(--surface-muted)]"
                onClick={() => onOpenRun(run.id)}
              >
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <p className="font-medium text-[var(--text-primary)]">{run.name}</p>
                    <p className="font-mono text-xs text-[var(--text-muted)]">
                      {getPredictionShortId(run.id)}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4 text-[var(--text-secondary)]">
                  {formatTimestamp(run.updatedAt ?? run.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <AppBadge tone={tone(run.status)}>{run.status}</AppBadge>
                </td>
                <td className="px-5 py-4">
                  <AppBadge
                    tone={feedbackStatusByRunId.get(run.id) === "COMPLETED" ? "success" : "warning"}
                  >
                    {feedbackStatusByRunId.get(run.id) ?? "PENDING"}
                  </AppBadge>
                </td>
                <td className="px-5 py-4 text-[var(--text-secondary)]">{run.results.length}</td>
                <td className="px-5 py-4 text-right">
                  <span className="inline-flex items-center gap-2 font-medium text-[var(--text-secondary)]">
                    View
                    <ArrowRight size={14} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppPanel>
  );
}
