/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeSchemaId } from "mlform/schema";
import type { ReportConfig } from "mlform/runtime";
import { isRecord, type JsonRecord } from "./shared";
import { mappingSourceForReport } from "./schema-run-report-mapping";

export type SchemaRunReportBinding = {
  modelId: string;
  signatureId: string;
  outputMapping?: JsonRecord;
};

export type SchemaRunReportUsage = {
  runtimeId: string;
  canonicalReportId: string;
  modelId: string;
  signatureId: string;
  source: string;
  report: ReportConfig;
};

const reportId = (report: ReportConfig): string | undefined =>
  typeof report.id === "string" ? report.id : undefined;

export const runtimeReportId = (
  canonicalReportId: string,
  modelId: string,
  signatureId: string,
): string => normalizeSchemaId(`${canonicalReportId}__${modelId}__${signatureId}`);

export const buildSchemaRunReportUsages = (
  bindings: readonly SchemaRunReportBinding[],
  reports: readonly ReportConfig[],
): SchemaRunReportUsage[] => {
  const counts = reports.reduce<Map<string, number>>((countById, report) => {
    const canonicalReportId = reportId(report);
    if (!canonicalReportId) return countById;
    const count = bindings.filter(
      (binding) => mappingSourceForReport(binding.outputMapping, canonicalReportId) !== undefined,
    ).length;
    countById.set(canonicalReportId, count);
    return countById;
  }, new Map());
  return bindings.flatMap((binding) =>
    reports.flatMap((report) => {
      const canonicalReportId = reportId(report);
      const source = canonicalReportId
        ? mappingSourceForReport(binding.outputMapping, canonicalReportId)
        : undefined;
      if (!canonicalReportId || !source) return [];
      const shared = (counts.get(canonicalReportId) ?? 0) > 1;
      return [
        {
          runtimeId: shared
            ? runtimeReportId(canonicalReportId, binding.modelId, binding.signatureId)
            : normalizeSchemaId(canonicalReportId),
          canonicalReportId,
          modelId: binding.modelId,
          signatureId: binding.signatureId,
          source,
          report,
        },
      ];
    }),
  );
};

export const toRuntimeReports = (usages: readonly SchemaRunReportUsage[]): ReportConfig[] =>
  usages.map(({ runtimeId, canonicalReportId, modelId, signatureId, source, report }) => ({
    ...report,
    id: runtimeId,
    source,
    canonicalReportId,
    modelId,
    signatureId,
  }));

export const runtimeUsageForReport = (
  report: ReportConfig,
  usages: readonly SchemaRunReportUsage[],
): SchemaRunReportUsage | undefined => {
  const runtimeId = reportId(report);
  if (!runtimeId) return undefined;
  return (
    usages.find((usage) => usage.runtimeId === runtimeId) ??
    usages.find((usage) => usage.canonicalReportId === runtimeId) ??
    (isRecord(report) &&
    typeof report.canonicalReportId === "string" &&
    typeof report.modelId === "string" &&
    typeof report.signatureId === "string"
      ? usages.find(
          (usage) =>
            usage.canonicalReportId === report.canonicalReportId &&
            usage.modelId === report.modelId &&
            usage.signatureId === report.signatureId,
        )
      : undefined)
  );
};
