/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatDisplayValue } from "@/capabilities/prediction-runtime/data/input-display";
import { builtinPrediction } from "@/capabilities/prediction-runtime/data/report-normalization";
import { getFormattedReportContent } from "@/capabilities/prediction-runtime/feedback/report-feedback-utils";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

const formatProbability = (value: unknown): string | null =>
  typeof value === "number" ? `${(value * 100).toFixed(2)}%` : null;

/** A built-in report's prediction, with the predicted class's probability when it has one. */
const describePrediction = (payload: unknown): string => {
  const record = isRecord(payload) ? payload : {};
  const probabilities = Array.isArray(record.probabilities) ? record.probabilities : [];
  const labels = Array.isArray(record.labels) ? record.labels : [];
  const prediction =
    builtinPrediction(record) ?? labels[probabilities.indexOf(Math.max(...probabilities))];
  if (prediction === undefined || prediction === null) return "";
  const index = labels.findIndex((label) => String(label) === String(prediction));
  const probability = formatProbability(index >= 0 ? probabilities[index] : undefined);
  const value = formatDisplayValue(prediction);
  return probability
    ? `Prediction result: ${value} · ${probability}`
    : `Prediction result: ${value}`;
};

const describeContent = (payload: unknown): string => {
  const content = getFormattedReportContent(payload).join("\n\n");
  return content ? `Prediction report:\n${content}` : "Prediction report";
};

/**
 * What a review step tells the reviewer a report answered. A built-in report is told by its
 * prediction in both of its steps, its assessment and its questionnaire, never by the payload
 * it was stored as; a custom report by the text it gave.
 */
export const describeReportResult = (kind: string, payload: unknown): string =>
  isBuiltinReportKind(kind) ? describePrediction(payload) : describeContent(payload);
