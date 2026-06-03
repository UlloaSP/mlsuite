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

const hasPendingReports = (
  reports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
): boolean =>
  reports.some((report) => {
    const status = statusOf(reportStates[report.id] ?? report.state);
    return status === "idle" || status === "loading";
  });

const sourceForReport = (
  reportId: string,
  bindings: readonly Binding[],
  context: JsonRecord,
): string => {
  const modelId = typeof context.modelId === "string" ? context.modelId : undefined;
  const signatureId = typeof context.signatureId === "string" ? context.signatureId : undefined;
  const binding = bindings.find(
    (item) => item.modelId === modelId && item.signatureId === signatureId,
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
      const sameModel = result.modelId === context.modelId;
      const sameSignature = result.signatureId === context.signatureId;
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
