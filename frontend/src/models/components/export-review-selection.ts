import type { ExplanationFeedbackDto, OutputFeedbackDto, PredictionDto } from "../api/modelService";

export type ExportReviewSelection = {
  excludedPredictionIds: Set<string>;
  excludedReviewers: Set<string>;
  excludedPredictionReviewers: Set<string>;
};

type ExportReviewerSummary = {
  reviewer: string;
  outputFeedback: OutputFeedbackDto[];
  explanationFeedback: ExplanationFeedbackDto[];
};

export type ExportPredictionReviewSummary = {
  prediction: PredictionDto;
  reviewers: ExportReviewerSummary[];
  reviewCount: number;
};

export const reviewerLabel = (feedback: { userId: number; userEmail: string }): string =>
  feedback.userEmail || `user-${feedback.userId}`;

export const predictionReviewerKey = (predictionId: string, reviewer: string) =>
  `${predictionId}::${reviewer}`;

export const emptyExportReviewSelection = (): ExportReviewSelection => ({
  excludedPredictionIds: new Set(),
  excludedReviewers: new Set(),
  excludedPredictionReviewers: new Set(),
});

export const isReviewSelected = (
  selection: ExportReviewSelection,
  predictionId: string,
  reviewer: string,
) =>
  !selection.excludedPredictionIds.has(predictionId) &&
  !selection.excludedReviewers.has(reviewer) &&
  !selection.excludedPredictionReviewers.has(predictionReviewerKey(predictionId, reviewer));

export const buildExportReviewSummaries = (
  predictions: PredictionDto[],
  outputFeedbackByPrediction: readonly OutputFeedbackDto[][],
  explanationFeedbackByPrediction: readonly ExplanationFeedbackDto[][],
): ExportPredictionReviewSummary[] =>
  predictions.map((prediction, index) => {
    const outputs = outputFeedbackByPrediction[index] ?? [];
    const explanations = explanationFeedbackByPrediction[index] ?? [];
    const reviewers = Array.from(
      new Set([...outputs.map(reviewerLabel), ...explanations.map(reviewerLabel)]),
    ).sort((left, right) => left.localeCompare(right));
    return {
      prediction,
      reviewCount: reviewers.length,
      reviewers: reviewers.map((reviewer) => ({
        reviewer,
        outputFeedback: outputs.filter((item) => reviewerLabel(item) === reviewer),
        explanationFeedback: explanations.filter((item) => reviewerLabel(item) === reviewer),
      })),
    };
  });

export const collectExportReviewers = (summaries: readonly ExportPredictionReviewSummary[]) =>
  Array.from(
    new Set(summaries.flatMap((summary) => summary.reviewers.map((item) => item.reviewer))),
  ).sort((left, right) => left.localeCompare(right));

export const selectedExportData = (
  selection: ExportReviewSelection,
  predictions: PredictionDto[],
  targetsByPrediction: readonly unknown[][],
  outputFeedbackByPrediction: readonly OutputFeedbackDto[][],
  explanationFeedbackByPrediction: readonly ExplanationFeedbackDto[][],
) => {
  const rows: Array<{
    prediction: PredictionDto;
    targets: unknown[];
    output: OutputFeedbackDto[];
    explanation: ExplanationFeedbackDto[];
  }> = [];
  predictions.forEach((prediction, index) => {
    if (selection.excludedPredictionIds.has(prediction.id)) return;
    rows.push({
      prediction,
      targets: targetsByPrediction[index] ?? [],
      output: (outputFeedbackByPrediction[index] ?? []).filter((item) =>
        isReviewSelected(selection, prediction.id, reviewerLabel(item)),
      ),
      explanation: (explanationFeedbackByPrediction[index] ?? []).filter((item) =>
        isReviewSelected(selection, prediction.id, reviewerLabel(item)),
      ),
    });
  });

  return {
    predictions: rows.map((item) => item.prediction),
    targetsByPrediction: rows.map((item) => item.targets),
    outputFeedbackByPrediction: rows.map((item) => item.output),
    explanationFeedbackByPrediction: rows.map((item) => item.explanation),
  };
};
