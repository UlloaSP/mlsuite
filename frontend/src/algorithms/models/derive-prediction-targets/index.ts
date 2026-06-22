/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type PredictionOutput = {
  kind?: string;
  probabilities?: number[][];
  mapping?: Array<string | number>;
  values?: Array<string | number>;
};

/**
 * DerivedPredictionTarget: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: derives feedback targets from prediction reports.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type DerivedPredictionTarget = {
  order: number;
  value: unknown;
};

/** asReport: internal helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const asReport = (value: Record<string, unknown>): PredictionOutput | null => {
  const reports = value.reports;
  if (!Array.isArray(reports) || reports.length === 0) {
    return null;
  }
  const first = reports[0];
  return typeof first === "object" && first !== null ? (first as PredictionOutput) : null;
};

/** getTargetClassLabel: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getTargetClassLabel = (
  schemaDefinition: unknown,
  order: number,
  classIndex: number,
): string | null => {
  if (
    typeof schemaDefinition !== "object" ||
    schemaDefinition === null ||
    !Array.isArray((schemaDefinition as { reports?: unknown }).reports)
  ) {
    return null;
  }
  const report = (schemaDefinition as { reports: unknown[] }).reports[order];
  if (
    typeof report !== "object" ||
    report === null ||
    !Array.isArray((report as { labels?: unknown }).labels)
  ) {
    return null;
  }
  const label = (report as { labels: unknown[] }).labels[classIndex];
  return typeof label === "string" ? label : null;
};

/**
 * derivePredictionTargets: performs the exported transformation for this algorithm.
 *
 * Purpose: derives feedback targets from prediction reports.
 * @param prediction - Input consumed by derivePredictionTargets; uses the derives feedback targets from prediction reports contract.
 * @param unknown - Input consumed by derivePredictionTargets; uses the derives feedback targets from prediction reports contract.
 * @param schemaDefinition - Input consumed by derivePredictionTargets; uses the derives feedback targets from prediction reports contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function derivePredictionTargets(
  prediction: Record<string, unknown>,
  schemaDefinition: unknown,
): DerivedPredictionTarget[] {
  const output = asReport(prediction);
  if (!output) {
    return [];
  }

  if (output.kind === "classifier" && Array.isArray(output.probabilities)) {
    return output.probabilities.map((target, index) => {
      const maxIndex = target.indexOf(Math.max(...target));
      return {
        order: index,
        value: {
          value:
            getTargetClassLabel(schemaDefinition, index, maxIndex) ??
            output.mapping?.[maxIndex] ??
            maxIndex,
          classIndex: maxIndex,
          probability: target[maxIndex],
        },
      };
    });
  }

  if (output.kind === "regressor" && Array.isArray(output.values)) {
    return output.values.map((target, index) => ({
      order: index,
      value: target,
    }));
  }

  return [];
}
