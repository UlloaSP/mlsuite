/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "./shared";
import { isSkippedSchemaReportPayload } from "./schema-report-plugin-context";
import { mappingSourceForReport, readReportContext, reportContextKey } from "./schema-run-report-mapping";

type ReportState = {
  status?: string;
  payload?: unknown;
  error?: unknown;
};

type ReportController = {
  id: string;
  state?: ReportState;
};

type Binding = {
  modelId: string;
  signatureId: string;
  outputMapping?: JsonRecord;
};

const statusOf = (state: ReportState | undefined): string => state?.status ?? "idle";

const contextId = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const hasPendingReports = (
  reports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
): boolean =>
  reports.some((report) => {
    const status = statusOf(reportStates[report.id] ?? report.state);
    const payload = (reportStates[report.id] ?? report.state)?.payload;
    if (isSkippedSchemaReportPayload(payload)) return false;
    return status === "idle" || status === "loading";
  });

const sourceForReport = (
  reportId: string,
  bindings: readonly Binding[],
  context: JsonRecord,
): string => {
  const modelId = contextId(context.modelId);
  const signatureId = contextId(context.signatureId);
  const binding = bindings.find(
    (item) => contextId(item.modelId) === modelId && contextId(item.signatureId) === signatureId,
  );
  return mappingSourceForReport(binding?.outputMapping, reportId) ?? reportId;
};

const patchResultOutput = (
  result: unknown,
  reportId: string,
  source: string,
  payload: unknown,
): unknown => {
  if (!isRecord(result)) return result;
  const output = isRecord(result.output) ? result.output : {};
  const reports = isRecord(output.reports) ? output.reports : {};
  return {
    ...result,
    output: {
      ...output,
      reports: {
        ...reports,
        [source]: payload,
        [reportId]: payload,
      },
    },
  };
};

export const buildSchemaRunRawFromSubmitResult = (
  raw: JsonRecord,
  formReports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
  bindings: readonly Binding[],
): { raw: JsonRecord; reportsPending: boolean } => {
  const contexts = isRecord(raw.reportContextById) ? raw.reportContextById : {};
  const reports = { ...(isRecord(raw.reports) ? raw.reports : {}) };
  let results = Array.isArray(raw.results) ? [...raw.results] : [];

  formReports.forEach((report) => {
    const state = reportStates[report.id] ?? report.state;
    if (statusOf(state) !== "ready" || state?.payload === undefined) return;
    if (isSkippedSchemaReportPayload(state.payload)) return;
    const context: JsonRecord = readReportContext(contexts, report.id) ?? {};
    const source = sourceForReport(report.id, bindings, context);
    reports[reportContextKey(report.id)] = state.payload;
    results = results.map((result) => {
      if (!isRecord(result)) return result;
      const sameModel = contextId(result.modelId) === contextId(context.modelId);
      const sameSignature = contextId(result.signatureId) === contextId(context.signatureId);
      return sameModel && sameSignature
        ? patchResultOutput(result, report.id, source, state.payload)
        : result;
    });
  });

  return {
    raw: { ...raw, reports, results },
    reportsPending: hasPendingReports(formReports, reportStates),
  };
};

export const reportStatesFromSnapshot = (
  value: unknown,
): Record<string, ReportState> =>
  isRecord(value) ? (value as Record<string, ReportState>) : {};
