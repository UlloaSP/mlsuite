/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppPanel, AppBadge } from "../../app/components";
import { formatTimestamp } from "../../models/utils";
import type { PredictionRunDto } from "../types";

type Props = {
  run: PredictionRunDto;
  feedbackStatus: "COMPLETED" | "PENDING";
};

const tone = (status: string) =>
  status === "SUCCESS" ? "success" : status === "PARTIAL_SUCCESS" ? "warning" : "danger";

export function SchemaRunDetailMetrics({ run, feedbackStatus }: Props) {
  return (
    <AppPanel className="grid gap-3 md:grid-cols-4">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Run status</p>
        <AppBadge tone={tone(run.status)}>{run.status}</AppBadge>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Feedback</p>
        <AppBadge tone={feedbackStatus === "COMPLETED" ? "success" : "warning"}>
          {feedbackStatus}
        </AppBadge>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Models</p>
        <p className="mt-1 font-semibold text-[var(--text-primary)]">{run.results.length}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Created</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {formatTimestamp(run.createdAt)}
        </p>
      </div>
    </AppPanel>
  );
}
