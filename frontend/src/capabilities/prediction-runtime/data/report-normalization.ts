/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { type JsonRecord, isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

const getAnalyzerReports = (value: unknown): JsonRecord[] => {
  if (!isRecord(value) || !Array.isArray(value.reports)) return [];
  return value.reports.filter(isRecord);
};

const toNumericArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.reduce<number[]>((items, item) => {
    const numeric = typeof item === "number" ? item : Number(item);
    if (!Number.isNaN(numeric)) items.push(numeric);
    return items;
  }, []);
};

export const mappingLabels = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!isRecord(value)) return undefined;
  return Object.entries(value)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, label]) => label)
    .filter((label): label is string => typeof label === "string");
};

/** Analyzers may return one probability row or a batch whose first row is this prediction. */
const probabilitiesOf = (output: JsonRecord): number[] =>
  Array.isArray(output.probabilities)
    ? toNumericArray(
        Array.isArray(output.probabilities[0]) ? output.probabilities[0] : output.probabilities,
      )
    : [];

const getClassifierPrediction = (output: JsonRecord): string | undefined => {
  const labels = mappingLabels(output.mapping) ?? [];
  const probabilities = probabilitiesOf(output);
  if (probabilities.length === 0)
    return typeof output.label === "string" ? output.label : undefined;
  return labels[probabilities.indexOf(Math.max(...probabilities))];
};

export const toAnalyzerReportPayload = (
  report: ReportConfig,
  parsed: unknown,
): JsonRecord | undefined => {
  const analyzerReport = getAnalyzerReports(parsed).find((output) => output.kind === report.kind);
  if (!analyzerReport) return undefined;
  if (report.kind === "classifier") {
    return {
      ...analyzerReport,
      probabilities: probabilitiesOf(analyzerReport),
      labels: mappingLabels(analyzerReport.mapping),
      prediction: getClassifierPrediction(analyzerReport),
    };
  }
  if (report.kind === "regressor") {
    return { ...analyzerReport, values: toNumericArray(analyzerReport.values) };
  }
  return undefined;
};
