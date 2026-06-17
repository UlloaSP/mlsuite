/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CombinedFeedbackStep } from "../models/combined-feedback-questionnaire";
import { createOutputFeedbackQuestionnaire } from "../models/output-feedback-questionnaire";
import { getEffectiveFeedbackValues } from "../models/questionnaire-feedback";
import type { QuestionnaireSchema } from "../models/questionnaire-schema";
import { isBuiltinReportKind } from "../app/utils/mlform/builtin-registry";
import { getFormattedReportContent } from "../models/report-feedback-utils";
import { getSchemaResultReports } from "./schema-run-display";
import type {
  PredictionResultDto,
  PredictionResultFeedbackDto,
  PredictionResultFeedbackType,
  SchemaVersionDto,
} from "./types";

type FeedbackKind = "OUTPUT" | "EXPLANATION";

export type SchemaFeedbackStep = CombinedFeedbackStep<FeedbackKind, PredictionResultFeedbackDto> & {
  resultId: string;
  type: PredictionResultFeedbackType;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const reportsOf = (schema: unknown): Record<string, unknown>[] =>
  isRecord(schema) && Array.isArray(schema.reports) ? schema.reports.filter(isRecord) : [];

const reportId = (report: Record<string, unknown>): string | undefined =>
  typeof report.id === "string" ? report.id : undefined;

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

export const feedbackKey = (
  resultId: string,
  type: PredictionResultFeedbackType,
  order: number,
): string => `${resultId}:${type}:${order}`;

export const buildSchemaFeedbackSteps = (
  version: SchemaVersionDto,
  results: readonly PredictionResultDto[],
  feedback: readonly PredictionResultFeedbackDto[],
): SchemaFeedbackStep[] => {
  const feedbackByKey = new Map(
    feedback.map((item) => [feedbackKey(item.resultId, item.type, item.order), item]),
  );
  const sourceReports = reportsOf(version.formSchema);

  return results.flatMap((result) => {
    if (result.status !== "SUCCESS") return [];
    const displayReports = getSchemaResultReports(version, result);
    return displayReports.flatMap((display, index): SchemaFeedbackStep[] => {
      const order = display.order ?? index;
      const config =
        sourceReports.find((report) => reportId(report) === display.id) ?? display.config;
      const outputFeedback = feedbackByKey.get(feedbackKey(result.id, "OUTPUT", order));
      const reportFeedback = feedbackByKey.get(feedbackKey(result.id, "EXPLANATION", order));
      const questionnaire = config ? feedbackQuestionnaire(config) : undefined;
      const isBuiltin = isBuiltinReportKind(display.kind);
      const explanationStep: SchemaFeedbackStep | null = questionnaire
        ? {
            id: `result-${result.id}-report-${order}`,
            kind: "EXPLANATION",
            type: "EXPLANATION",
            resultId: result.id,
            order,
            title: `${display.label} review`,
            description: reportDescription(display.payload),
            schema: questionnaire,
            initialValues: getEffectiveFeedbackValues(reportFeedback, questionnaire),
            feedback: reportFeedback,
          }
        : null;
      if (!isBuiltin) return explanationStep ? [explanationStep] : [];
      const outputSchema = createOutputFeedbackQuestionnaire(
        config,
        fakeTarget(order, display.payload),
        result.output,
      );
      const outputStep: SchemaFeedbackStep = {
        id: `result-${result.id}-output-${order}`,
        kind: "OUTPUT",
        type: "OUTPUT",
        resultId: result.id,
        order,
        title: display.label,
        description: outputDescription(display.payload),
        schema: outputSchema,
        initialValues: getEffectiveFeedbackValues(outputFeedback, outputSchema),
        feedback: outputFeedback,
      };
      return explanationStep ? [outputStep, explanationStep] : [outputStep];
    });
  });
};
