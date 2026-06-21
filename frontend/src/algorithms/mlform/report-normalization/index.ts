/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { type JsonRecord, isRecord } from "../../../algorithms/mlform/shared";

/** getAnalyzerReports: internal lookup helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getAnalyzerReports = (value: unknown): JsonRecord[] => {
  if (!isRecord(value) || !Array.isArray(value.reports)) return [];
  return value.reports.filter(isRecord);
};

/** toNumericArray: internal normalization helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const toNumericArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.reduce<number[]>((items, item) => {
    const numeric = typeof item === "number" ? item : Number(item);
    if (!Number.isNaN(numeric)) items.push(numeric);
    return items;
  }, []);
};

const mappingLabels = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!isRecord(value)) return undefined;
  return Object.entries(value)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, label]) => label)
    .filter((label): label is string => typeof label === "string");
};

/** getClassifierPrediction: internal lookup helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getClassifierPrediction = (output: JsonRecord): string | undefined => {
  const labels = mappingLabels(output.mapping) ?? [];
  const rawProbabilities = Array.isArray(output.probabilities)
    ? Array.isArray(output.probabilities[0])
      ? output.probabilities[0]
      : output.probabilities
    : undefined;
  const probabilities = toNumericArray(rawProbabilities);
  if (probabilities.length === 0)
    return typeof output.label === "string" ? output.label : undefined;
  return labels[probabilities.indexOf(Math.max(...probabilities))];
};

/**
 * toAnalyzerReportPayload: converts data into another contract shape
 *
 * Purpose: normalizes analyzer report-array payloads into MLForm report payloads.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const toAnalyzerReportPayload = (
  report: ReportConfig,
  parsed: unknown,
): JsonRecord | undefined => {
  const analyzerReport = getAnalyzerReports(parsed).find((output) => output.kind === report.kind);
  if (!analyzerReport) return undefined;
  if (report.kind === "classifier") {
    return {
      ...analyzerReport,
      probabilities: Array.isArray(analyzerReport.probabilities)
        ? toNumericArray(
            Array.isArray(analyzerReport.probabilities[0])
              ? analyzerReport.probabilities[0]
              : analyzerReport.probabilities,
          )
        : [],
      labels: mappingLabels(analyzerReport.mapping),
      prediction: getClassifierPrediction(analyzerReport),
    };
  }
  if (report.kind === "regressor") {
    return { ...analyzerReport, values: toNumericArray(analyzerReport.values) };
  }
  return undefined;
};
