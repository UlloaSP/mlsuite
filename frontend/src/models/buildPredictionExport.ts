/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { validateMlformSchema } from "../app/utils/mlform/schema-validation";
import type { CatalogExplanationDefinition } from "../app/utils/mlform/custom-explanation";
import type {
  ExplanationFeedbackDto,
  OutputFeedbackDto,
  PredictionDto,
  TargetDto,
} from "./api/modelService";
import { extractPredictionExplanationEntries } from "./explanation-feedback-utils";
import { getOutputFeedbackFieldIds } from "./output-feedback-questionnaire";
import { getEffectiveFeedbackValues, getQuestionnaireFieldIds } from "./questionnaire-feedback";
import {
  buildTargetFeedbackValue,
  getSchemaAwareTargetValue,
  getTargetReportKey,
} from "./target-utils";
import { flatten, getExplanationHeaders, toCell, toRecord } from "./components/export-csv-utils";

export type PredictionExportData = {
  headers: string[];
  rows: string[][];
};

export type BuildPredictionExportOptions = {
  predictions: PredictionDto[];
  targetsByPrediction: readonly TargetDto[][];
  outputFeedbackByPrediction: readonly OutputFeedbackDto[][];
  explanationFeedbackByPrediction: readonly ExplanationFeedbackDto[][];
  signatureSchema?: unknown;
  customExplanationDefinitions: readonly CatalogExplanationDefinition[];
};

const reviewerLabel = (feedback: { userId: number; userEmail: string }): string =>
  feedback.userEmail || `user-${feedback.userId}`;

const collectReviewerLabels = (
  outputFeedbackByPrediction: readonly OutputFeedbackDto[][],
  explanationFeedbackByPrediction: readonly ExplanationFeedbackDto[][],
): string[] => {
  const labels = Array.from(
    new Set([
      ...outputFeedbackByPrediction.flat().map(reviewerLabel),
      ...explanationFeedbackByPrediction.flat().map(reviewerLabel),
    ]),
  );
  labels.sort((left, right) => left.localeCompare(right));
  return labels;
};

const getFeedbackRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export function buildPredictionExportData({
  predictions,
  targetsByPrediction,
  outputFeedbackByPrediction,
  explanationFeedbackByPrediction,
  signatureSchema,
  customExplanationDefinitions,
}: BuildPredictionExportOptions): PredictionExportData {
  if (!predictions.length) return { headers: [], rows: [] };

  const inputKeys = Object.keys(flatten(toRecord(predictions[0].inputs))).sort();
  const schemaResult = signatureSchema
    ? validateMlformSchema(signatureSchema, { customExplanationDefinitions })
    : null;
  const schema = schemaResult?.success ? schemaResult.data : null;
  const reviewerLabels = collectReviewerLabels(
    outputFeedbackByPrediction,
    explanationFeedbackByPrediction,
  );
  const targetHeaders = (schema?.reports ?? []).flatMap((_report: ReportConfig, index: number) => {
    const targetKey = getTargetReportKey(signatureSchema, index);
    return [
      `output.${targetKey}.predicted`,
      ...reviewerLabels.map((reviewer) => `output.${targetKey}.feedback.${reviewer}`),
    ];
  });
  const explanationHeaders = signatureSchema
    ? getExplanationHeaders(signatureSchema, customExplanationDefinitions, reviewerLabels)
    : [];
  const headers = ["prediction_name", ...inputKeys, ...targetHeaders, ...explanationHeaders];

  const rows = predictions.map((prediction, index) => {
    const targets = Array.from(targetsByPrediction[index] ?? []);
    targets.sort((left, right) => Number(left.order) - Number(right.order));
    const inputs = flatten(toRecord(prediction.inputs));
    const targetMap = new Map(targets.map((target) => [target.order, target]));
    const outputFeedback = outputFeedbackByPrediction[index] ?? [];
    const explanationFeedback = explanationFeedbackByPrediction[index] ?? [];

    const targetValues = (schema?.reports ?? []).flatMap((_report: ReportConfig, order: number) => {
      const target = targetMap.get(order);
      const reportConfig = schema?.reports?.[order];
      const kind = typeof reportConfig?.kind === "string" ? reportConfig.kind : null;
      const fieldIds = getOutputFeedbackFieldIds(kind);
      const predicted = target
        ? getSchemaAwareTargetValue(target.value, signatureSchema, order, prediction.prediction)
        : "";
      const feedbackValues = reviewerLabels.map((reviewer) => {
        const feedback = outputFeedback.find(
          (item) => item.order === order && reviewerLabel(item) === reviewer,
        );
        const feedbackRecord = getFeedbackRecord(feedback?.value);
        const assessmentRaw = feedbackRecord?.[fieldIds.assessment] ?? "";
        const userRealValue =
          assessmentRaw !== ""
            ? buildTargetFeedbackValue(String(assessmentRaw), signatureSchema, order)
            : "";
        return toCell(
          userRealValue !== ""
            ? getSchemaAwareTargetValue(
                userRealValue,
                signatureSchema,
                order,
                prediction.prediction,
              )
            : "",
        );
      });
      return [toCell(predicted), ...feedbackValues];
    });

    const explanationEntries =
      explanationHeaders.length > 0
        ? extractPredictionExplanationEntries(
            prediction.prediction,
            signatureSchema,
            customExplanationDefinitions,
          )
        : [];
    const explanationValues = explanationEntries.flatMap((explanation) => {
      const cells = [toCell(explanation.content.join("\n\n"))];
      if (!explanation.feedbackQuestionnaire) return cells;
      const fieldIds = getQuestionnaireFieldIds(explanation.feedbackQuestionnaire);
      return [
        ...cells,
        ...fieldIds.flatMap((fieldId) =>
          reviewerLabels.map((reviewer) => {
            const feedback = explanationFeedback.find(
              (item) => item.order === explanation.order && reviewerLabel(item) === reviewer,
            );
            const values = getEffectiveFeedbackValues(feedback, explanation.feedbackQuestionnaire);
            return toCell(values[fieldId]);
          }),
        ),
      ];
    });

    return [
      toCell(prediction.name),
      ...inputKeys.map((key) => toCell(inputs[key])),
      ...targetValues,
      ...explanationValues,
    ];
  });

  return { headers, rows };
}
