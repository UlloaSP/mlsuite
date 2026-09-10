/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PredictionStatusSummary } from "@/capabilities/prediction-runtime/feedback/PredictionStatusSummary";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import {
  formatTimestamp,
  getPredictionShortId,
} from "@/capabilities/prediction-runtime/data/model-utils";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";
import { type FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";

type Props = {
  runs: PredictionRunDto[];
  onOpenRun: (runId: string) => void;
  feedbackStatusByRunId?: Map<string, FeedbackStatusDisplay>;
};
const EMPTY_FEEDBACK_STATUSES = new Map<string, FeedbackStatusDisplay>();

export function SchemaRunHistoryList({
  runs,
  onOpenRun,
  feedbackStatusByRunId = EMPTY_FEEDBACK_STATUSES,
}: Props) {
  return runs.map((run) => {
    const feedback = feedbackStatusByRunId.get(run.id) ?? "LOADING";
    return (
      <CatalogEntry
        key={run.id}
        title={run.name}
        description={`${run.results.length} model${run.results.length === 1 ? "" : "s"}`}
        metadata={
          <>
            <span>#{getPredictionShortId(run.id)}</span>
            <span>By {run.createdByName || run.createdByEmail || "Unknown author"}</span>
            <span>Updated {formatTimestamp(run.updatedAt ?? run.createdAt)}</span>
          </>
        }
        details={<PredictionStatusSummary status={run.status} feedback={feedback} />}
        onOpen={() => onOpenRun(run.id)}
      />
    );
  });
}
