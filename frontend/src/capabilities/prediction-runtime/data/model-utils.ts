/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type JsonRecord = Record<string, unknown>;

export { formatTimestamp } from "@/shared/lib/date-time";

type ModelLabelSource = {
  type: string;
  specificType: string;
};

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** toIdString: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const toIdString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";
/**
 * findModelById: performs the exported transformation for this algorithm.
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const findModelById = <T extends { id: unknown }>(
  models: T[],
  modelId?: string,
): T | undefined => models.find((model) => toIdString(model.id) === toIdString(modelId));

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
export const getModelAlgorithmLabel = (model: ModelLabelSource): string =>
  `${getModelTypeLabel(model.type)} - ${model.specificType}`;

/**
 * getPredictionReports: extracts a derived value without mutating input
 *
 * Purpose: normalizes model and prediction metadata for display and lookup.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getPredictionReports = (value: unknown): JsonRecord[] => {
  if (!isRecord(value) || !Array.isArray(value.reports)) {
    return [];
  }

  return value.reports.filter(isRecord);
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
