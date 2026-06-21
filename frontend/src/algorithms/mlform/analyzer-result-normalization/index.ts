/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import { getBackendBaseUrl } from "../../../app/config/runtimeConfig";
import { toAnalyzerReportPayload } from "../../../algorithms/mlform/report-normalization";
import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";
import { reportTargetForBinding } from "../schema-run-report-mapping";
import { schemaRunDebug } from "../../schema/run-debug";

type Options = {
  parsed: unknown;
  modelId: string;
  modelName?: string;
  modelInput: Record<string, unknown>;
  reports: readonly ReportConfig[];
};

type NormalizedAnalyzerResult = {
  reports: JsonRecord[];
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
    isRecord(parsed) && Array.isArray(parsed.reports) ? parsed.reports.filter(isRecord) : [];
  const normalizedMeta = isRecord(parsed) && isRecord(parsed.meta) ? { ...parsed.meta } : {};
  normalizedMeta.modelId ??= modelId;
  normalizedMeta.backendUrl ??= getBackendBaseUrl();
  normalizedMeta.backendFieldValues ??= modelInput;
  const normalizedRaw = isRecord(parsed) ? parsed : { raw: parsed };
  schemaRunDebug("normalize-analyzer.start", {
    parsed,
    modelId,
    modelName,
    modelInput,
    reports,
    normalizedReports,
    normalizedMeta,
  });

  reports.forEach((report) => {
    const kind = typeof report.kind === "string" ? report.kind : "";
    const target =
      reportTargetForBinding(report, { modelId, modelName }) ??
      targetKey(mappedTarget(report.mappedTo, { modelId, modelName }));
    schemaRunDebug("normalize-analyzer.report-target", { report, kind, target });
    if (!target || normalizedReports.some((item) => String(item.mappedTo) === target)) return;
    const analyzerPayload = toAnalyzerReportPayload(report, parsed);
    schemaRunDebug("normalize-analyzer.report-payload", { report, target, analyzerPayload });
    if (analyzerPayload === undefined) return;
    normalizedReports.push({
      ...analyzerPayload,
      id: report.id,
      kind,
      mappedTo: target,
    });
  });

  const normalized = {
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
  schemaRunDebug("normalize-analyzer.done", normalized);
  return normalized;
};
