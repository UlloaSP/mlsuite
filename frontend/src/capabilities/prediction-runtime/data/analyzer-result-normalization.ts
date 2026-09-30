/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { getBackendBaseUrl } from "@/shared/config/runtime";
import { toAnalyzerReportPayload } from "@/capabilities/prediction-runtime/data/report-normalization";
import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { mappedTarget, targetKey } from "@/capabilities/prediction-runtime/mlform/mapped-to";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";

type Options = {
  parsed: unknown;
  modelId: number;
  modelName?: string;
  modelInput: Record<string, unknown>;
  reports: readonly ReportConfig[];
};

type NormalizedAnalyzerResult = {
  reports: JsonRecord[];
  meta: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export const normalizeAnalyzerPredictionResult = ({
  parsed,
  modelId,
  modelName,
  modelInput,
  reports,
}: Options): NormalizedAnalyzerResult => {
  const normalizedReports =
    isRecord(parsed) && Array.isArray(parsed.reports) ? parsed.reports.filter(isRecord) : [];
  const normalizedMeta = isRecord(parsed) && isRecord(parsed.meta) ? { ...parsed.meta } : {};
  normalizedMeta.modelId ??= String(modelId);
  normalizedMeta.backendUrl ??= getBackendBaseUrl();
  normalizedMeta.backendFieldValues ??= modelInput;
  const normalizedRaw = isRecord(parsed) ? parsed : { raw: parsed };

  reports.forEach((report) => {
    const kind = typeof report.kind === "string" ? report.kind : "";
    const target =
      reportTargetForBinding(report, { modelId, modelName }) ??
      targetKey(mappedTarget(report.mappedTo, { modelId, modelName }));
    if (!target || normalizedReports.some((item) => String(item.mappedTo) === target)) return;
    const analyzerPayload = toAnalyzerReportPayload(report, parsed);
    if (analyzerPayload === undefined) return;
    normalizedReports.push({
      ...analyzerPayload,
      id: report.id,
      kind,
      mappedTo: target,
    });
  });

  return {
    reports: normalizedReports,
    meta: normalizedMeta,
    raw: {
      ...normalizedRaw,
      reports: normalizedReports,
      meta: {
        ...(isRecord(normalizedRaw.meta) ? normalizedRaw.meta : {}),
        ...normalizedMeta,
      },
    },
  };
};
