/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CombinedFeedbackStep } from "../models/combined-feedback-questionnaire";
import { createOutputFeedbackQuestionnaire } from "../models/output-feedback-questionnaire";
import { getEffectiveFeedbackValues } from "../models/questionnaire-feedback";
import type { QuestionnaireSchema } from "../models/questionnaire-schema";
import { isBuiltinReportKind } from "../app/utils/mlform/builtin-registry";
import { getSchemaResultReports } from "./schema-run-display";
import type {
  PredictionResultDto,
  PredictionResultFeedbackDto,
  PredictionResultFeedbackType,
  SchemaVersionDto,
} from "./types";

type FeedbackKind = "OUTPUT" | "EXPLANATION";

export type SchemaFeedbackStep = CombinedFeedbackStep<
  FeedbackKind,
  PredictionResultFeedbackDto
> & {
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
      const config = sourceReports.find((report) => reportId(report) === display.id);
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
          description: "Report feedback",
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
        description: "Prediction result",
        schema: outputSchema,
        initialValues: getEffectiveFeedbackValues(outputFeedback, outputSchema),
        feedback: outputFeedback,
      };
      return explanationStep ? [outputStep, explanationStep] : [outputStep];
    });
  });
};
