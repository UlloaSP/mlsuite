import type {
  ExplanationFeedbackDto,
  OutputFeedbackDto,
  TargetDto,
} from "../../models/api/modelService";
import type { QuestionnaireSchema } from "../../models/questionnaire-schema";
import {
  buildCombinedFeedbackQuestionnaire,
  createCombinedQuestionnaireTransport,
  type CombinedFeedbackStep,
  valuesForCombinedStep,
} from "../../models/combined-feedback-questionnaire";
import {
  getEffectiveFeedbackValues,
  type PredictionReportDescriptor,
} from "../../models/questionnaire-feedback";
import { createOutputFeedbackQuestionnaire } from "../../models/output-feedback-questionnaire";
import { buildOutputFeedbackInitialValues } from "../../models/output-feedback-values";
import {
  formatProbability,
  getSchemaAwareTargetValue,
  getTargetLabel,
  getTargetProbability,
} from "../../models/target-utils";

export type FeedbackKind = "output" | "report";

export type ReviewFeedbackStep = CombinedFeedbackStep<
  FeedbackKind,
  OutputFeedbackDto | ExplanationFeedbackDto
>;

type BuildReviewFeedbackStepsArgs = {
  targets: TargetDto[];
  outputFeedbackByOrder: Map<number, OutputFeedbackDto>;
  explanationFeedbackByOrder: Map<number, ExplanationFeedbackDto>;
  reports: Record<string, unknown>[];
  signatureSchema: unknown;
  predictionValue: unknown;
  feedbackReports: PredictionReportDescriptor[];
};

const text = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "No value";
  return typeof value === "string" ? value : JSON.stringify(value);
};

const outputDescription = (
  target: TargetDto,
  signatureSchema: unknown,
  predictionValue: unknown,
): string => {
  const value = getSchemaAwareTargetValue(
    target.value,
    signatureSchema,
    target.order,
    predictionValue,
  );
  const probability = getTargetProbability(target.value);
  return probability === null
    ? `Prediction result: ${text(value)}`
    : `Prediction result: ${text(value)} · ${formatProbability(probability)}`;
};

export const buildReviewFeedbackSteps = ({
  targets,
  outputFeedbackByOrder,
  explanationFeedbackByOrder,
  reports,
  signatureSchema,
  predictionValue,
  feedbackReports,
}: BuildReviewFeedbackStepsArgs): ReviewFeedbackStep[] => [
  ...targets.map((target, index) => {
    const schema = createOutputFeedbackQuestionnaire(
      reports[target.order],
      target,
      predictionValue,
    );
    return {
      id: `output-${target.order}`,
      kind: "output" as const,
      order: target.order,
      title: `Output ${index + 1}: ${getTargetLabel(signatureSchema, target.order)}`,
      description: outputDescription(target, signatureSchema, predictionValue),
      schema,
      initialValues: buildOutputFeedbackInitialValues(
        outputFeedbackByOrder.get(target.order),
        schema,
      ),
      feedback: outputFeedbackByOrder.get(target.order),
    };
  }),
  ...feedbackReports.flatMap((report, index) => {
    if (!report.feedbackQuestionnaire) return [];
    return [
      {
        id: `report-${report.order}`,
        kind: "report" as const,
        order: report.order,
        title: `Report ${index + 1}: ${report.label}`,
        description: `Prediction report:\n${report.content.join("\n\n")}`,
        schema: report.feedbackQuestionnaire,
        initialValues: getEffectiveFeedbackValues(
          explanationFeedbackByOrder.get(report.order),
          report.feedbackQuestionnaire,
        ),
        feedback: explanationFeedbackByOrder.get(report.order),
      },
    ];
  }),
];

export const buildCombinedReviewQuestionnaire = (
  steps: readonly ReviewFeedbackStep[],
): { schema: QuestionnaireSchema; initialValues: Record<string, unknown> } =>
  buildCombinedFeedbackQuestionnaire(steps);

export const valuesForStep = (
  allValues: Record<string, unknown>,
  step: ReviewFeedbackStep,
): Record<string, unknown> => valuesForCombinedStep(allValues, step);

export const createReviewQuestionnaireTransport = (
  onSubmit: (values: Record<string, unknown>) => Promise<void>,
): ReturnType<typeof createCombinedQuestionnaireTransport> =>
  createCombinedQuestionnaireTransport(onSubmit);
