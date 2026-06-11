/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord } from "../app/utils/mlform/shared";
import type { JsonRecord } from "./types";

const MODEL_METADATA_KEYS = new Set(["modelId", "signatureId", "backendUrl", "endpoint", "status"]);

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !MODEL_METADATA_KEYS.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)]),
  );
};

export const stableSchemaFingerprint = (value: unknown): string => JSON.stringify(sortValue(value));

export const reportSource = (report: JsonRecord, fallback: string): string =>
  getString(report.source) ?? getString(report.id) ?? fallback;

export const reportContractFingerprint = (report: JsonRecord, fallback: string): string => {
  const source = reportSource(report, fallback);
  const semantic: JsonRecord = {};
  Object.entries({ ...report, id: source, source }).forEach(([key, value]) => {
    if (key !== "modelId" && key !== "signatureId") semantic[key] = value;
  });
  return stableSchemaFingerprint(semantic);
};
