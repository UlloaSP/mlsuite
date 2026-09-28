import { schemaRunReviewerLabel } from "@/features/schemas/lib/export";
import type { PredictionResultFeedbackDto, PredictionRunDto } from "@/shared/api/openapi.gen";

export type SchemaRunExportSelection = {
  excludedRunIds: Set<number>;
  excludedReviewers: Set<string>;
  excludedRunReviewers: Set<string>;
};

type ReviewerSummary = {
  reviewer: string;
  outputFeedback: PredictionResultFeedbackDto[];
  explanationFeedback: PredictionResultFeedbackDto[];
};

export type SchemaRunExportRunSummary = {
  run: PredictionRunDto;
  reviewers: ReviewerSummary[];
  reviewCount: number;
};

export const schemaRunReviewerKey = (runId: number, reviewer: string) => `${runId}::${reviewer}`;

export const emptySchemaRunExportSelection = (): SchemaRunExportSelection => ({
  excludedRunIds: new Set(),
  excludedReviewers: new Set(),
  excludedRunReviewers: new Set(),
});

export const isSchemaRunReviewSelected = (
  selection: SchemaRunExportSelection,
  runId: number,
  reviewer: string,
) =>
  !selection.excludedRunIds.has(runId) &&
  !selection.excludedReviewers.has(reviewer) &&
  !selection.excludedRunReviewers.has(schemaRunReviewerKey(runId, reviewer));

export const buildSchemaRunExportSummaries = (
  runs: PredictionRunDto[],
  feedbackByRun: readonly PredictionResultFeedbackDto[][],
): SchemaRunExportRunSummary[] =>
  runs.map((run, index) => {
    const feedback = feedbackByRun[index] ?? [];
    const reviewers = Array.from(new Set(feedback.map(schemaRunReviewerLabel))).sort();
    return {
      run,
      reviewCount: reviewers.length,
      reviewers: reviewers.map((reviewer) => ({
        reviewer,
        outputFeedback: feedback.filter(
          (item) => schemaRunReviewerLabel(item) === reviewer && item.type === "OUTPUT",
        ),
        explanationFeedback: feedback.filter(
          (item) => schemaRunReviewerLabel(item) === reviewer && item.type === "EXPLANATION",
        ),
      })),
    };
  });

export const collectSchemaRunExportReviewers = (summaries: readonly SchemaRunExportRunSummary[]) =>
  Array.from(
    new Set(summaries.flatMap((summary) => summary.reviewers.map((item) => item.reviewer))),
  ).sort();

export const selectedSchemaRunExportData = (
  selection: SchemaRunExportSelection,
  runs: PredictionRunDto[],
  feedback: readonly PredictionResultFeedbackDto[],
) => {
  const selectedRuns = runs.filter((run) => !selection.excludedRunIds.has(run.id));
  const runIdByResult = new Map(
    selectedRuns.flatMap((run) => run.results.map((result) => [result.id, run.id] as const)),
  );
  return {
    runs: selectedRuns,
    feedback: feedback.filter((item) => {
      const runId = runIdByResult.get(item.resultId);
      return (
        runId !== undefined &&
        isSchemaRunReviewSelected(selection, runId, schemaRunReviewerLabel(item))
      );
    }),
  };
};

/** A copy of `set` with `value` added, or removed when it was already there. */
export const toggledInSet = <T>(set: ReadonlySet<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};
