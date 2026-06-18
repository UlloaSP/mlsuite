/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";

export type BindingIdentity = {
  modelId: string;
  modelName?: string;
};

const bindingKeys = ({
  modelId,
  modelName,
}: BindingIdentity): string[] => [
  ...(modelName ? [modelName] : []),
  modelId,
];

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

export const targetKey = (target: string | number | undefined): string | undefined =>
  target === undefined ? undefined : String(target);

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
