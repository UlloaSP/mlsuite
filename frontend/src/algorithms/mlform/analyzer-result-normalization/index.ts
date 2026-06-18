/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { getBackendBaseUrl } from "../../../app/config/runtimeConfig";
import { toLegacyReportPayload } from "../../../algorithms/mlform/report-normalization";
import { isRecord } from "../../../algorithms/mlform/shared";
import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";

type Options = {
  parsed: unknown;
  modelId: string;
  modelName?: string;
  modelInput: Record<string, unknown>;
  reports: readonly ReportConfig[];
};

type NormalizedAnalyzerResult = {
  reports: Record<string, unknown>;
  meta: Record<string, unknown>;
  raw: Record<string, unknown>;
};

/**
 * normalizeAnalyzerPredictionResult: normalizes loose runtime data into the app contract
 *
 * Purpose: normalizes analyzer prediction responses into MLForm report and meta payloads.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const normalizeAnalyzerPredictionResult = ({
  parsed,
  modelId,
  modelName,
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
    const target = targetKey(mappedTarget(report.mappedTo, { modelId, modelName }));
    if (!target || normalizedReports[target] !== undefined) return;
    const legacyPayload = toLegacyReportPayload(report, parsed);
    if (legacyPayload === undefined) return;
    normalizedReports[target] = legacyPayload;
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
