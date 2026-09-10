/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import { formatTimestamp } from "@/capabilities/prediction-runtime/data/model-utils";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";
import type { SchemaFeedbackStatus } from "@/capabilities/prediction-runtime/feedback/feedback-completion";

type Props = {
  run: PredictionRunDto;
  bookmarkName: string;
  feedbackStatus: SchemaFeedbackStatus;
};

const tone = (status: string) =>
  status === "SUCCESS" ? "success" : status === "PARTIAL_SUCCESS" ? "warning" : "danger";

export function SchemaRunMetadataRow({ run, bookmarkName, feedbackStatus }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-[var(--border-soft)] py-4 text-sm text-[var(--text-secondary)]">
      <span>{formatTimestamp(run.createdAt)}</span>
      <AppBadge tone={tone(run.status)}>{run.status}</AppBadge>
      <AppBadge
        tone={
          feedbackStatus === "NOT_REQUIRED"
            ? "neutral"
            : feedbackStatus === "COMPLETED"
              ? "success"
              : "warning"
        }
      >
        {feedbackStatus === "NOT_REQUIRED"
          ? "No feedback configured"
          : feedbackStatus === "COMPLETED"
            ? "Feedback given"
            : "Feedback pending"}
      </AppBadge>
      <span>
        <span className="text-[var(--text-muted)]">Bookmark</span> {bookmarkName}
      </span>
      <span>
        {run.results.length} {run.results.length === 1 ? "model" : "models"}
      </span>
    </div>
  );
}
