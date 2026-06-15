/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import { isRecord, type JsonRecord } from "./shared";

export const mappingSourceForReport = (mapping: unknown, reportId: string): string | undefined => {
  if (!isRecord(mapping)) return undefined;
  if (typeof mapping[reportId] === "string") return mapping[reportId];
  const normalizedReportId = normalizeSchemaId(reportId);
  const entry = Object.entries(mapping).find(
    ([key]) => normalizeSchemaId(key) === normalizedReportId,
  );
  return typeof entry?.[1] === "string" ? entry[1] : undefined;
};

export const hasMappedReport = (mapping: unknown, reportId: string): boolean =>
  mappingSourceForReport(mapping, reportId) !== undefined;

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
