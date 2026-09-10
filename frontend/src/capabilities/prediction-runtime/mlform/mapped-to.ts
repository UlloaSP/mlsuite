/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  mappedToKey,
  resolveMappedRoutes,
  resolveMappedTargets,
  resolveMappedTo,
  type MappedTo,
  type MappedToRoute,
} from "mlform/schema";

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

const asMappedTo = (value: unknown): MappedTo | undefined => {
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as MappedTo;
};

export const mappedTargets = (mappedTo: unknown): string[] =>
  resolveMappedTargets(asMappedTo(mappedTo), undefined).map(mappedToKey);

export const mappedRoutes = (mappedTo: unknown): MappedToRoute[] =>
  resolveMappedRoutes(asMappedTo(mappedTo), undefined);

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
  const mapping = asMappedTo(mappedTo);
  if (!mapping) return undefined;
  if (binding) {
    return (
      (binding.modelName ? resolveMappedTo(mapping, binding.modelName) : undefined) ??
      resolveMappedTo(mapping, binding.modelId)
    );
  }
  const values = resolveMappedTargets(mapping, undefined);
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
  target === undefined ? undefined : mappedToKey(target);
