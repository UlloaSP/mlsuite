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

export type BindingIdentity = {
  modelId: number | string;
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

export const mappedTarget = (
  mappedTo: unknown,
  binding?: BindingIdentity,
): string | number | undefined => {
  const mapping = asMappedTo(mappedTo);
  if (!mapping) return undefined;
  if (binding) {
    return (
      (binding.modelName ? resolveMappedTo(mapping, binding.modelName) : undefined) ??
      resolveMappedTo(mapping, String(binding.modelId))
    );
  }
  const values = resolveMappedTargets(mapping, undefined);
  if (values.length === 1) return values[0];
  return undefined;
};

export const targetKey = (target: string | number | undefined): string | undefined =>
  target === undefined ? undefined : mappedToKey(target);
