/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import {
  type BindingIdentity,
  mappedTarget,
  targetKey,
} from "@/capabilities/prediction-runtime/mlform/mapped-to";

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
