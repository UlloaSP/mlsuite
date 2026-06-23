/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import {
  type BindingIdentity,
  mappedTarget,
  targetKey,
} from "../../../algorithms/mlform/mapped-to";

/**
 * reportTargetForBinding: performs the exported transformation for this algorithm.
 *
 * Purpose: resolves schema report mappedTo records to model-specific report targets.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const reportTargetForBinding = (
  report: unknown,
  binding?: BindingIdentity,
): string | undefined => {
  if (!isRecord(report)) return undefined;
  return targetKey(mappedTarget(report.mappedTo, binding));
};

/**
 * reportContextKey: performs the exported transformation for this algorithm.
 *
 * Purpose: resolves schema report mappedTo records to model-specific report targets.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const reportContextKey = (reportId: string): string => normalizeSchemaId(reportId);

/**
 * readReportContext: reads a value from nested records using supported aliases
 *
 * Purpose: resolves schema report mappedTo records to model-specific report targets.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const readReportContext = (contexts: unknown, reportId: string): JsonRecord | undefined => {
  if (!isRecord(contexts)) return undefined;
  const direct = contexts[reportId];
  if (isRecord(direct)) return direct;
  const normalizedReportId = normalizeSchemaId(reportId);
  const entry = Object.entries(contexts).find(
    ([key]) => normalizeSchemaId(key) === normalizedReportId && isRecord(contexts[key]),
  );
  return isRecord(entry?.[1]) ? entry[1] : undefined;
};
