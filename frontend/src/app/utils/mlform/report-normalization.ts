/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { type JsonRecord, isRecord } from "./shared";

const getLegacyOutputs = (value: unknown): JsonRecord[] => {
  if (!isRecord(value) || !Array.isArray(value.outputs)) return [];
  return value.outputs.filter(isRecord);
};

const toNumericArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value.reduce<number[]>((items, item) => {
    const numeric = typeof item === "number" ? item : Number(item);
    if (!Number.isNaN(numeric)) items.push(numeric);
    return items;
  }, []);
};

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
