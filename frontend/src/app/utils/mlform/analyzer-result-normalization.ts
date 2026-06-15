/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { getBackendBaseUrl } from "../../config/runtimeConfig";
import { toLegacyReportPayload } from "./report-normalization";
import { isRecord } from "./shared";

type Options = {
  parsed: unknown;
  modelId: string;
  modelInput: Record<string, unknown>;
  reports: readonly ReportConfig[];
};

type NormalizedAnalyzerResult = {
  reports: Record<string, unknown>;
  meta: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export const normalizeAnalyzerPredictionResult = ({
  parsed,
  modelId,
  modelInput,
  reports,
}: Options): NormalizedAnalyzerResult => {
  const normalizedReports =
    isRecord(parsed) && isRecord(parsed.reports) ? { ...parsed.reports } : {};
  const normalizedMeta = isRecord(parsed) && isRecord(parsed.meta) ? { ...parsed.meta } : {};
  normalizedMeta.modelId ??= modelId;
  normalizedMeta.backendUrl ??= getBackendBaseUrl();
  normalizedMeta.backendFieldValues ??= modelInput;
  const normalizedRaw = isRecord(parsed) ? parsed : { raw: parsed };

  reports.forEach((report) => {
    const reportSource = report.source ?? report.id;
    if (!reportSource || normalizedReports[reportSource] !== undefined) return;
    const legacyPayload = toLegacyReportPayload(report, parsed);
    if (legacyPayload !== undefined) normalizedReports[reportSource] = legacyPayload;
  });

  return {
    reports: normalizedReports,
    meta: normalizedMeta,
    raw: {
      ...normalizedRaw,
      reports: {
        ...(isRecord(normalizedRaw.reports) ? normalizedRaw.reports : {}),
        ...normalizedReports,
      },
      meta: {
        ...(isRecord(normalizedRaw.meta) ? normalizedRaw.meta : {}),
        ...normalizedMeta,
      },
    },
  };
};
