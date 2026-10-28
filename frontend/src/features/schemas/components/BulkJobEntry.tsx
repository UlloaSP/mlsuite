/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { formatTimestamp } from "@/shared/lib/date-time";
import {
  isOpenJob,
  usePredictionJobAction,
  usePredictionJobFailures,
} from "@/features/schemas/api/prediction-job-queries";
import type { PredictionJobDto } from "@/shared/api/openapi.gen";

const TONES = {
  QUEUED: "neutral",
  RUNNING: "info",
  COMPLETED: "success",
  CANCELLED: "warning",
} as const;

/** One bulk upload: how far it got, its failed rows and why, and the way to stop or retry it. */
export function BulkJobEntry({ bookmarkId, job }: { bookmarkId: string; job: PredictionJobDto }) {
  const [showFailures, setShowFailures] = useState(false);
  const action = usePredictionJobAction(bookmarkId);
  const failures = usePredictionJobFailures(job.id, showFailures);
  const handled = job.doneRows + job.failedRows;
  const open = isOpenJob(job);

  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <AppBadge tone={TONES[job.status]}>{job.status}</AppBadge>
          <span className="tabular-nums text-fg">
            {job.doneRows} of {job.totalRows} saved
          </span>
          {job.failedRows > 0 ? (
            <span className="tabular-nums text-danger-fg">{job.failedRows} failed</span>
          ) : null}
          {job.pendingRows > 0 ? (
            <span className="tabular-nums text-fg-muted">{job.pendingRows} to run</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          {job.failedRows > 0 ? (
            <AppButton size="sm" variant="ghost" onClick={() => setShowFailures(!showFailures)}>
              {showFailures ? "Hide failures" : "Show failures"}
            </AppButton>
          ) : null}
          {open ? (
            <AppButton
              size="sm"
              variant="secondary"
              disabled={action.isPending}
              onClick={() => action.mutate({ jobId: job.id, action: "cancel" })}
            >
              Cancel
            </AppButton>
          ) : job.failedRows > 0 ? (
            <AppButton
              size="sm"
              variant="secondary"
              disabled={action.isPending}
              onClick={() => action.mutate({ jobId: job.id, action: "retry" })}
            >
              Retry failed rows
            </AppButton>
          ) : null}
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`Bulk upload ${job.id} progress`}
        aria-valuemin={0}
        aria-valuemax={job.totalRows}
        aria-valuenow={handled}
        className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full bg-accent"
          style={{ width: `${job.totalRows ? (handled / job.totalRows) * 100 : 0}%` }}
        />
      </div>
      <p className="text-xs text-fg-secondary">
        Started {formatTimestamp(job.createdAt)}
        {job.createdByName ? ` by ${job.createdByName}` : ""}
        {job.finishedAt ? ` · finished ${formatTimestamp(job.finishedAt)}` : ""}
      </p>
      {showFailures ? (
        failures.isError ? (
          <p className="text-sm text-danger-fg">The failed rows could not be loaded.</p>
        ) : failures.isLoading ? (
          <p className="text-sm text-fg-muted">Loading failed rows…</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {(failures.data ?? []).map((failure) => (
              <li key={failure.rowIndex}>
                <span className="font-mono text-fg">{failure.name}</span>
                <span className="text-fg-secondary"> · {failure.error}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </li>
  );
}
