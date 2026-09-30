/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { toExecutableSchemaVersion } from "@/capabilities/prediction-runtime/mlform/executable-schema";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import {
  predictionResultFeedbackQueryOptions,
  usePredictionRun,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { SchemaRunFeedbackSummary } from "@/features/schemas/components/SchemaRunFeedbackSummary";

type Props = {
  runId: string;
  reviewerId: number | string;
  /** Answers arrive while the page is open; how often to look for them. */
  pollMs?: number;
};

/** One reviewer's answers on an inference, per questionnaire step. */
export function ReviewerFeedbackAnswers({ runId, reviewerId, pollMs }: Props) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const { data: run, isError } = usePredictionRun(runId);
  const { data: version } = useSchemaVersion(run?.schemaVersionId);
  // Answers are read against the snapshot the inference ran on.
  const executableVersion = useMemo(
    () => (version ? toExecutableSchemaVersion(version) : undefined),
    [version],
  );
  const feedbackQueries = useQueries({
    queries: (run?.results ?? []).map((result) => ({
      ...predictionResultFeedbackQueryOptions(organizationId, result.id),
      // Answers change while the reviewer works: refetch on opening, then poll.
      staleTime: 0,
      refetchInterval: pollMs,
    })),
  });
  const reviewerFeedback = feedbackQueries
    .flatMap((query) => query.data ?? [])
    .filter((item) => String(item.userId) === String(reviewerId));

  if (isError)
    return (
      <AppEmptyState
        compact
        title="Answers unavailable"
        description="The inference could not be loaded."
      />
    );
  if (!run || !executableVersion || feedbackQueries.some((query) => query.isLoading))
    return <AppLoadingState compact label="Loading answers…" />;
  if (reviewerFeedback.length === 0)
    return (
      <AppEmptyState
        compact
        title="No answers yet"
        description="They appear here as soon as the reviewer saves them."
      />
    );

  return (
    <SchemaRunFeedbackSummary run={run} version={executableVersion} feedback={reviewerFeedback} />
  );
}
