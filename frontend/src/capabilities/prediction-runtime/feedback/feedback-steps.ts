/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CombinedFeedbackStep } from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import { createOutputFeedbackQuestionnaire } from "@/capabilities/prediction-runtime/feedback/output-feedback-questionnaire";
import { agreedFeedbackValues } from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { QuestionnaireSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { getFormattedReportContent } from "@/capabilities/prediction-runtime/feedback/report-feedback-utils";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type {
  PredictionResultDto,
  PredictionResultFeedbackDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

type PredictionResultFeedbackType = PredictionResultFeedbackDto["type"];
type PredictionResult = Pick<PredictionResultDto, "id" | "modelId" | "output" | "status">;
type SchemaVersion = Pick<SchemaVersionDto, "formSchema" | "bindings">;

type FeedbackKind = "OUTPUT" | "EXPLANATION";

export type SchemaFeedbackStep = CombinedFeedbackStep<FeedbackKind, never> & {
  type: PredictionResultFeedbackType;
  targets: SchemaFeedbackTarget[];
};

export type SchemaFeedbackTarget = {
  resultId: number;
  modelId: number;
  feedback?: PredictionResultFeedbackDto;
};

const reportsOf = (schema: unknown): Record<string, unknown>[] =>
  isRecord(schema) && Array.isArray(schema.reports) ? schema.reports.filter(isRecord) : [];

const feedbackQuestionnaire = (report: Record<string, unknown>): QuestionnaireSchema | undefined =>
  isRecord(report.feedbackQuestionnaire)
    ? (report.feedbackQuestionnaire as QuestionnaireSchema)
    : undefined;

const fakeTarget = (order: number, value: unknown) =>
  ({
    id: String(order),
    order,
    value,
  }) as any;

const displayRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const formatProbability = (value: unknown): string | null =>
  typeof value === "number" ? `${(value * 100).toFixed(2)}%` : null;

const outputDescription = (payload: unknown): string => {
  const record = displayRecord(payload);
  const probabilities = Array.isArray(record.probabilities) ? record.probabilities : [];
  const labels = Array.isArray(record.labels) ? record.labels : [];
  const inferredIndex = probabilities.indexOf(Math.max(...probabilities));
  const prediction = record.prediction ?? record.value ?? labels[inferredIndex] ?? payload;
  const index = labels.findIndex((label) => String(label) === String(prediction));
  const probability = formatProbability(index >= 0 ? probabilities[index] : undefined);
  return probability
    ? `Prediction result: ${String(prediction)} · ${probability}`
    : `Prediction result: ${String(prediction)}`;
};

const reportDescription = (payload: unknown): string => {
  const content = getFormattedReportContent(payload).join("\n\n");
  return content ? `Prediction report:\n${content}` : "Prediction report";
};

const feedbackKey = (resultId: number, type: PredictionResultFeedbackType, order: number): string =>
  `${resultId}:${type}:${order}`;

type DisplayTarget = {
  result: PredictionResult;
  display: ReturnType<typeof getSchemaResultReports>[number];
};

const stepTargets = (
  members: readonly DisplayTarget[],
  type: PredictionResultFeedbackType,
  order: number,
  feedbackByKey: ReadonlyMap<string, PredictionResultFeedbackDto>,
): SchemaFeedbackTarget[] =>
  members.map(({ result }) => ({
    resultId: result.id,
    modelId: result.modelId,
    feedback: feedbackByKey.get(feedbackKey(result.id, type, order)),
  }));

/** Several models answering one report are told apart by name. */
const combinedDescription = (
  version: SchemaVersion,
  members: readonly DisplayTarget[],
  describe: (payload: unknown) => string,
): string =>
  members.length === 1
    ? describe(members[0]?.display.payload)
    : members
        .map(({ result, display }) => {
          const model = version.bindings.find((binding) => binding.modelId === result.modelId);
          return `${model?.modelName ?? `Model ${result.modelId}`}: ${describe(display.payload)}`;
        })
        .join("\n");

export const buildSchemaFeedbackSteps = (
  version: SchemaVersion,
  results: readonly PredictionResult[],
  feedback: readonly PredictionResultFeedbackDto[],
): SchemaFeedbackStep[] => {
  const feedbackByKey = new Map(
    feedback.map((item) => [feedbackKey(item.resultId, item.type, item.order), item]),
  );
  const sourceReports = reportsOf(version.formSchema);

  return sourceReports.flatMap((config, order): SchemaFeedbackStep[] => {
    const members = results.flatMap((result): DisplayTarget[] => {
      if (result.status !== "SUCCESS") return [];
      const display = getSchemaResultReports(version, result).find(
        (candidate) => candidate.order === order,
      );
      return display ? [{ result, display }] : [];
    });
    const first = members[0];
    if (!first) return [];
    const questionnaire = feedbackQuestionnaire(config);
    const explanationTargets = stepTargets(members, "EXPLANATION", order, feedbackByKey);
    const explanationStep: SchemaFeedbackStep | null = questionnaire
      ? {
          id: `report-${order}-explanation`,
          kind: "EXPLANATION",
          type: "EXPLANATION",
          targets: explanationTargets,
          order,
          title: `${first.display.label} review`,
          description: combinedDescription(version, members, reportDescription),
          schema: questionnaire,
          initialValues: agreedFeedbackValues(explanationTargets, questionnaire) ?? {},
        }
      : null;
    if (!isBuiltinReportKind(first.display.kind)) {
      return explanationStep ? [explanationStep] : [];
    }
    const outputSchema = createOutputFeedbackQuestionnaire(
      config,
      fakeTarget(order, first.display.payload),
      first.result.output,
    );
    const outputTargets = stepTargets(members, "OUTPUT", order, feedbackByKey);
    const outputStep: SchemaFeedbackStep = {
      id: `report-${order}-output`,
      kind: "OUTPUT",
      type: "OUTPUT",
      targets: outputTargets,
      order,
      title: first.display.label,
      description: combinedDescription(version, members, outputDescription),
      schema: outputSchema,
      initialValues: agreedFeedbackValues(outputTargets, outputSchema) ?? {},
    };
    return explanationStep ? [outputStep, explanationStep] : [outputStep];
  });
};
