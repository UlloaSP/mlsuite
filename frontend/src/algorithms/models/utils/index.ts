/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ModelDto } from "../../../models/api/modelService";

type JsonRecord = Record<string, unknown>;

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** toIdString: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const toIdString = (value: unknown): string => String(value ?? "");
/** dateTimeFormatter: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * toTimestampMillis: converts data into another contract shape
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toTimestampMillis = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

/**
 * formatTimestamp: converts raw data into a stable human-readable string
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const formatTimestamp = (value: string): string => {
  const timestamp = toTimestampMillis(value);
  return timestamp === 0 ? value : dateTimeFormatter.format(timestamp);
};

/**
 * findModelById: performs the exported transformation for this algorithm.
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const findModelById = (models: ModelDto[], modelId?: string): ModelDto | undefined =>
  models.find((model) => toIdString(model.id) === toIdString(modelId));

/** getModelTypeLabel: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getModelTypeLabel = (type: string): string => {
  switch (type) {
    case "classifier":
      return "Classifier";
    case "regressor":
      return "Regressor";
    default:
      return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : "Model";
  }
};

/**
 * getModelAlgorithmLabel: extracts a derived value without mutating input
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getModelAlgorithmLabel = (model: Pick<ModelDto, "type" | "specificType">): string =>
  `${getModelTypeLabel(model.type)} - ${model.specificType}`;

/**
 * getPredictionOutputs: extracts a derived value without mutating input
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getPredictionOutputs = (value: unknown): JsonRecord[] => {
  if (!isRecord(value) || !Array.isArray(value.outputs)) {
    return [];
  }

  return value.outputs.filter(isRecord);
};

/**
 * getPredictionShortId: extracts a derived value without mutating input
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getPredictionShortId = (id: unknown): string => {
  const normalized = toIdString(id);
  return normalized.length <= 8 ? normalized : normalized.slice(0, 8);
};

/**
 * getPredictionExecutionTime: extracts a derived value without mutating input
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getPredictionExecutionTime = (value: unknown): number | null => {
  const outputs = getPredictionOutputs(value);
  const executionTime = outputs[0]?.execution_time;
  return typeof executionTime === "number" ? executionTime : null;
};

/**
 * formatExecutionTime: converts raw data into a stable human-readable string
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const formatExecutionTime = (time: number | null): string => {
  if (time === null) {
    return "N/A";
  }

  if (time < 1000) {
    return `${time.toFixed(2)} ms`;
  }

  if (time < 60000) {
    return `${(time / 1000).toFixed(2)} s`;
  }

  if (time < 3600000) {
    return `${(time / 60000).toFixed(2)} min`;
  }

  return `${(time / 3600000).toFixed(2)} h`;
};
