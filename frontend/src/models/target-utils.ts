/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getPredictionOutputs } from "./utils";
import { getOutputReports } from "./report-contract";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getTargetReportConfig = (
  signatureSchema: unknown,
  order: number,
): Record<string, unknown> | undefined => getOutputReports(signatureSchema)[order];

export const getTargetReportKey = (signatureSchema: unknown, order: number): string => {
  const report = getTargetReportConfig(signatureSchema, order);
  const explicitId = typeof report?.id === "string" ? report.id.trim() : "";
  if (explicitId) {
    return explicitId;
  }

  return `target-${order + 1}`;
};

const getTargetDisplayValue = (value: unknown): unknown =>
  isRecord(value) && "value" in value ? value.value : value;

export const getTargetProbability = (value: unknown): number | null => {
  const probability = isRecord(value) ? value.probability : null;
  return typeof probability === "number" ? probability : null;
};

export const formatProbability = (probability: number): string =>
  `${(probability * 100).toFixed(2)}%`;

export const getTargetLabel = (signatureSchema: unknown, order: number): string => {
  const report = getOutputReports(signatureSchema)[order];
  return typeof report?.label === "string" && report.label.trim()
    ? report.label
    : `Target ${order + 1}`;
};

const getTargetKind = (signatureSchema: unknown, order: number): string | null => {
  const kind = getOutputReports(signatureSchema)[order]?.kind;
  return typeof kind === "string" ? kind : null;
};

const getTargetClassLabel = (
  signatureSchema: unknown,
  order: number,
  classIndex: number,
): string | null => {
  const labels = getOutputReports(signatureSchema)[order]?.labels;
  const label = Array.isArray(labels) ? labels[classIndex] : undefined;
  return typeof label === "string" ? label : null;
};

export const getSchemaAwareTargetValue = (
  value: unknown,
  signatureSchema: unknown,
  order: number,
  predictionValue?: unknown,
): unknown => {
  if (isRecord(value) && typeof value.classIndex === "number") {
    return (
      getTargetClassLabel(signatureSchema, order, value.classIndex) ?? getTargetDisplayValue(value)
    );
  }
  const displayValue = getTargetDisplayValue(value);
  const output = getPredictionOutputs(predictionValue).find((item) => item.type === "classifier");
  const mapping = Array.isArray(output?.mapping) ? output.mapping : [];
  const mappedIndex = mapping.findIndex((item) => String(item) === String(displayValue));
  return mappedIndex >= 0
    ? (getTargetClassLabel(signatureSchema, order, mappedIndex) ?? displayValue)
    : getTargetDisplayValue(value);
};

export const buildTargetFeedbackValue = (
  rawValue: string,
  signatureSchema: unknown,
  order: number,
  predictionValue?: unknown,
): unknown => {
  const kind = getTargetKind(signatureSchema, order);
  if (kind === "regressor") {
    return Number(rawValue);
  }
  if (kind === "classifier") {
    const output = getPredictionOutputs(predictionValue).find((item) => item.type === "classifier");
    const mapping = Array.isArray(output?.mapping) ? output.mapping : [];
    const labelIndex = getOutputReports(signatureSchema)[order]?.labels;
    const labels = Array.isArray(labelIndex) ? labelIndex : [];
    const mappedIndex = mapping.findIndex((item) => String(item) === rawValue);
    const namedIndex = labels.findIndex((item) => String(item) === rawValue);
    const numericIndex = Number(rawValue);
    const classIndex =
      mappedIndex >= 0
        ? mappedIndex
        : namedIndex >= 0
          ? namedIndex
          : Number.isFinite(numericIndex)
            ? numericIndex
            : -1;
    return {
      value: getTargetClassLabel(signatureSchema, order, classIndex) ?? rawValue,
      classIndex,
    };
  }
  return rawValue;
};
