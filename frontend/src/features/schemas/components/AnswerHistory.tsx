/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { predictionResultFeedbackHistoryQueryOptions } from "@/features/schemas/api/schema-queries";
import { answerHistoryGroups } from "@/features/schemas/lib/answer-history";
import { AnswerRevisionEntry } from "@/features/schemas/components/AnswerRevisionEntry";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  version: Pick<SchemaVersionDto, "bindings">;
  steps: readonly SchemaFeedbackStep[];
  /** Keeps to this member's answers; every author's otherwise. */
  authorId?: number;
};

/**
 * Every change of the answers to a run's questions, per question and newest first: answers given,
 * changed and removed, by whom, when, and in which review. Removed answers stay in the record.
 */
export function AnswerHistory({ version, steps, authorId }: Props) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const resultIds = [
    ...new Set(steps.flatMap((step) => step.targets.map((target) => target.resultId))),
  ];
  const queries = useQueries({
    queries: resultIds.map((resultId) => ({
      ...predictionResultFeedbackHistoryQueryOptions(organizationId, resultId),
      staleTime: 0,
    })),
  });

  if (queries.some((query) => query.isError))
    return (
      <AppEmptyState
        compact
        title="History unavailable"
        description="The answer history could not be loaded."
      />
    );
  if (queries.some((query) => query.isLoading))
    return <AppLoadingState compact label="Loading answer history…" />;
  const groups = answerHistoryGroups(
    steps,
    queries.flatMap((query) => query.data ?? []),
    authorId,
  );
  if (groups.length === 0)
    return (
      <AppEmptyState
        compact
        title="No answers yet"
        description="Each answer, change and removal is listed here once a reviewer saves one."
      />
    );

  const modelName = (resultId: number, step: SchemaFeedbackStep) => {
    if (step.targets.length < 2) return undefined;
    const modelId = step.targets.find((target) => target.resultId === resultId)?.modelId;
    return version.bindings.find((binding) => binding.modelId === modelId)?.modelName;
  };

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ step, revisions }) => (
        <section key={step.id} className="flex flex-col gap-1">
          <AppSectionTitle>{step.title}</AppSectionTitle>
          <ol>
            {revisions.map((revision) => (
              <AnswerRevisionEntry
                key={revision.id}
                revision={revision}
                schema={step.schema}
                modelName={modelName(revision.resultId, step)}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
