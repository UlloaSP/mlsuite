import type { PredictionResultFeedbackDto, PredictionRunDto } from "../types";

export type SchemaRunExportSelection = {
  excludedRunIds: Set<string>;
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

export const schemaRunReviewerLabel = (feedback: PredictionResultFeedbackDto): string =>
  feedback.userEmail || feedback.userName || `user-${feedback.userId ?? "unknown"}`;

export const schemaRunReviewerKey = (runId: string, reviewer: string) => `${runId}::${reviewer}`;

export const emptySchemaRunExportSelection = (): SchemaRunExportSelection => ({
  excludedRunIds: new Set(),
  excludedReviewers: new Set(),
  excludedRunReviewers: new Set(),
});

export const isSchemaRunReviewSelected = (
  selection: SchemaRunExportSelection,
  runId: string,
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

export const collectSchemaRunExportReviewers = (
  summaries: readonly SchemaRunExportRunSummary[],
) =>
  Array.from(
    new Set(summaries.flatMap((summary) => summary.reviewers.map((item) => item.reviewer))),
  ).sort();

export const selectedSchemaRunExportData = (
  selection: SchemaRunExportSelection,
  runs: PredictionRunDto[],
  feedbackByRun: readonly PredictionResultFeedbackDto[][],
) => {
  const selectedRuns: PredictionRunDto[] = [];
  const selectedFeedback: PredictionResultFeedbackDto[] = [];
  runs.forEach((run, index) => {
    if (selection.excludedRunIds.has(run.id)) return;
    selectedRuns.push(run);
    selectedFeedback.push(
      ...(feedbackByRun[index] ?? []).filter((item) =>
        isSchemaRunReviewSelected(selection, run.id, schemaRunReviewerLabel(item)),
      ),
    );
  });
  return { runs: selectedRuns, feedback: selectedFeedback };
};
