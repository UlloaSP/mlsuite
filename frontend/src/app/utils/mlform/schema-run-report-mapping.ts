/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import { isRecord, type JsonRecord } from "./shared";
import { type BindingIdentity, mappedTarget, targetKey } from "./mapped-to";

export const reportTargetForBinding = (
  report: unknown,
  binding?: BindingIdentity,
): string | undefined => {
  if (!isRecord(report)) return undefined;
  return targetKey(mappedTarget(report.mappedTo, binding));
};

export const reportContextKey = (reportId: string): string => normalizeSchemaId(reportId);

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
