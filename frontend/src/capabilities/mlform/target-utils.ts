/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getPredictionReports } from "@/capabilities/mlform/model-utils";
import { getOutputReports } from "@/capabilities/mlform/report-contract";

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** getTargetDisplayValue: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getTargetDisplayValue = (value: unknown): unknown =>
  isRecord(value) && "value" in value ? value.value : value;

/**
 * getTargetProbability: extracts a derived value without mutating input
 *
 * Purpose: derives target labels/probabilities and feedback values from prediction reports.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getTargetProbability = (value: unknown): number | null => {
  const probability = isRecord(value) ? value.probability : null;
  return typeof probability === "number" ? probability : null;
};

/**
 * formatProbability: converts raw data into a stable human-readable string
 *
 * Purpose: derives target labels/probabilities and feedback values from prediction reports.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const formatProbability = (probability: number): string =>
  `${(probability * 100).toFixed(2)}%`;

/**
 * getTargetLabel: extracts a derived value without mutating input
 *
 * Purpose: derives target labels/probabilities and feedback values from prediction reports.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getTargetLabel = (schemaDefinition: unknown, order: number): string => {
  const report = getOutputReports(schemaDefinition)[order];
  return typeof report?.label === "string" && report.label.trim()
    ? report.label
    : `Target ${order + 1}`;
};

/** getTargetClassLabel: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getTargetClassLabel = (
  schemaDefinition: unknown,
  order: number,
  classIndex: number,
): string | null => {
  const labels = getOutputReports(schemaDefinition)[order]?.labels;
  const label = Array.isArray(labels) ? labels[classIndex] : undefined;
  return typeof label === "string" ? label : null;
};

/**
 * getSchemaAwareTargetValue: extracts a derived value without mutating input
 *
 * Purpose: derives target labels/probabilities and feedback values from prediction reports.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getSchemaAwareTargetValue = (
  value: unknown,
  schemaDefinition: unknown,
  order: number,
  predictionValue?: unknown,
): unknown => {
  if (isRecord(value) && typeof value.classIndex === "number") {
    return (
      getTargetClassLabel(schemaDefinition, order, value.classIndex) ?? getTargetDisplayValue(value)
    );
  }
  const displayValue = getTargetDisplayValue(value);
  const output = getPredictionReports(predictionValue).find((item) => item.kind === "classifier");
  const mapping = Array.isArray(output?.mapping) ? output.mapping : [];
  const mappedIndex = mapping.findIndex((item) => String(item) === String(displayValue));
  return mappedIndex >= 0
    ? (getTargetClassLabel(schemaDefinition, order, mappedIndex) ?? displayValue)
    : getTargetDisplayValue(value);
};
