/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";

/**
 * BindingIdentity: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: writes model/report binding targets into mappedTo records.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type BindingIdentity = {
  modelId: string;
  modelName?: string;
};

/** bindingKeys: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const bindingKeys = ({
  modelId,
  modelName,
}: BindingIdentity): string[] => [
  ...(modelName ? [modelName] : []),
  modelId,
];

/**
 * mappedTarget: performs the exported transformation for this algorithm.
 *
 * Purpose: writes model/report binding targets into mappedTo records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const mappedTarget = (
  mappedTo: unknown,
  binding?: BindingIdentity,
): string | number | undefined => {
  if (typeof mappedTo === "string" || typeof mappedTo === "number") return mappedTo;
  if (!isRecord(mappedTo)) return undefined;
  if (binding) {
    for (const key of bindingKeys(binding)) {
      const value = mappedTo[key];
      if (typeof value === "string" || typeof value === "number") return value;
    }
    return undefined;
  }
  const values = Object.values(mappedTo).filter(
    (value): value is string | number => typeof value === "string" || typeof value === "number",
  );
  if (values.length === 1) return values[0];
  return undefined;
};

/**
 * targetKey: performs the exported transformation for this algorithm.
 *
 * Purpose: writes model/report binding targets into mappedTo records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const targetKey = (target: string | number | undefined): string | undefined =>
  target === undefined ? undefined : String(target);

/**
 * setMappedValue: performs the exported transformation for this algorithm.
 *
 * Purpose: writes model/report binding targets into mappedTo records.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const setMappedValue = (
  payload: JsonRecord,
  mappedTo: unknown,
  binding: BindingIdentity | undefined,
  value: unknown,
): boolean => {
  const key = targetKey(mappedTarget(mappedTo, binding));
  if (!key) return false;
  payload[key] = value;
  return true;
};
