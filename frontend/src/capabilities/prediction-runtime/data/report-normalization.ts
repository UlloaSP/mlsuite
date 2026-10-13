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

/** The runtime names the class the model decides; a model that decides none is read as its most probable one. */
const mostProbableClass = (output: JsonRecord): string | undefined => {
  const labels = mappingLabels(output.mapping) ?? [];
  const probabilities = probabilitiesOf(output);
  return labels[probabilities.indexOf(Math.max(...probabilities))];
};

/**
 * A built-in report as a run stores it: a classifier's one row of probabilities, its class
 * labels and its predicted class; a regressor's values as numbers. Idempotent, so a payload
 * already in that shape is returned as it is.
 */
export const toStoredBuiltinPayload = (
  kind: unknown,
  output: JsonRecord,
): JsonRecord | undefined => {
  if (kind === "classifier") {
    const stored = mappingLabels(output.labels);
    return {
      ...output,
      probabilities: probabilitiesOf(output),
      labels: stored?.length ? stored : mappingLabels(output.mapping),
      prediction:
        typeof output.prediction === "string" || typeof output.prediction === "number"
          ? output.prediction
          : mostProbableClass(output),
    };
  }
  if (kind === "regressor") return { ...output, values: toNumericArray(output.values) };
  return undefined;
};

/**
 * The runtime answers one report per model output and names the output's position on each;
 * a schema report reads the answer of its kind for the output it maps to.
 */
export const toAnalyzerReportPayload = (
  report: ReportConfig,
  parsed: unknown,
  target: string,
): JsonRecord | undefined => {
  const analyzerReport = getAnalyzerReports(parsed).find(
    (output) => output.kind === report.kind && String(output.output) === target,
  );
  return analyzerReport && toStoredBuiltinPayload(report.kind, analyzerReport);
};

/**
 * What a public run answered for a report. The server made the whole run, a plugin report's
 * explanation included, so a plugin kind takes the runtime's answer as its payload.
 */
export const toPublicReportPayload = (
  report: ReportConfig,
  answer: JsonRecord,
): JsonRecord | undefined => toStoredBuiltinPayload(report.kind, answer) ?? answer;
