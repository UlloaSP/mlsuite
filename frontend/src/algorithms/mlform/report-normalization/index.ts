/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { type JsonRecord, isRecord } from "../../../algorithms/mlform/shared";

/** getLegacyOutputs: internal lookup helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getLegacyOutputs = (value: unknown): JsonRecord[] => {
  if (!isRecord(value) || !Array.isArray(value.outputs)) return [];
  return value.outputs.filter(isRecord);
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

/** getClassifierPrediction: internal lookup helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getClassifierPrediction = (output: JsonRecord): string | undefined => {
  const labels = Array.isArray(output.mapping)
    ? output.mapping.filter((item): item is string => typeof item === "string")
    : [];
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
 * toLegacyReportPayload: converts data into another contract shape
 *
 * Purpose: normalizes MLForm report payloads back to legacy report payload shape.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export const toLegacyReportPayload = (
  report: ReportConfig,
  parsed: unknown,
): JsonRecord | undefined => {
  const legacyOutput = getLegacyOutputs(parsed).find((output) => output.type === report.kind);
  if (!legacyOutput) return undefined;
  if (report.kind === "classifier") {
    return {
      ...legacyOutput,
      probabilities: Array.isArray(legacyOutput.probabilities)
        ? toNumericArray(
            Array.isArray(legacyOutput.probabilities[0])
              ? legacyOutput.probabilities[0]
              : legacyOutput.probabilities,
          )
        : [],
      labels: Array.isArray(legacyOutput.mapping)
        ? legacyOutput.mapping.filter((item): item is string => typeof item === "string")
        : undefined,
      prediction: getClassifierPrediction(legacyOutput),
    };
  }
  if (report.kind === "regressor") {
    return { ...legacyOutput, values: toNumericArray(legacyOutput.values) };
  }
  return undefined;
};
