/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord, type JsonRecord } from "../../../algorithms/mlform/shared";
import {
  isSkippedSchemaReportPayload,
  skippedReportIdsKey,
} from "../../schema/report-plugin-context";
import {
  readReportContext,
  reportTargetForBinding,
  reportContextKey,
} from "../../../algorithms/mlform/schema-run-report-mapping";

type ReportState = {
  status?: string;
  payload?: unknown;
  error?: unknown;
};

type ReportController = {
  id: string;
  state?: ReportState;
  mappedTo?: unknown;
};

type Binding = {
  modelId: string;
  modelName?: string;
};

const statusOf = (state: ReportState | undefined): string => state?.status ?? "idle";

const contextId = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const hasPendingReports = (
  reports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
  skippedReportIds: ReadonlySet<string>,
): boolean =>
  reports.some((report) => {
    if (skippedReportIds.has(reportContextKey(report.id)) || skippedReportIds.has(report.id)) {
      return false;
    }
    const status = statusOf(reportStates[report.id] ?? report.state);
    const payload = (reportStates[report.id] ?? report.state)?.payload;
    if (isSkippedSchemaReportPayload(payload)) return false;
    return status === "idle" || status === "loading";
  });

const targetForReport = (
  report: ReportController,
  bindings: readonly Binding[],
  context: JsonRecord,
): string | undefined => {
  const modelId = contextId(context.modelId);
  const binding = bindings.find((item) => contextId(item.modelId) === modelId);
  return reportTargetForBinding(report, binding);
};

const patchResultOutput = (
  result: unknown,
  reportId: string,
  target: string,
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
        [reportContextKey(reportId)]: payload,
        [reportId]: payload,
        [target]: payload,
      },
    },
  };
};

const storeReportPayload = (
  reports: JsonRecord,
  reportId: string,
  target: string,
  payload: unknown,
) => {
  reports[reportContextKey(reportId)] = payload;
  reports[reportId] = payload;
  reports[target] = payload;
};

export const buildSchemaRunRawFromSubmitResult = (
  raw: JsonRecord,
  formReports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
  bindings: readonly Binding[],
): { raw: JsonRecord; reportsPending: boolean } => {
  const contexts = isRecord(raw.reportContextById) ? raw.reportContextById : {};
  const reports = { ...(isRecord(raw.reports) ? raw.reports : {}) };
  const skippedReportIds = new Set(
    Array.isArray(raw[skippedReportIdsKey]) ? raw[skippedReportIdsKey].map(String) : [],
  );
  let results = Array.isArray(raw.results) ? [...raw.results] : [];

  formReports.forEach((report) => {
    const state = reportStates[report.id] ?? report.state;
    if (statusOf(state) !== "ready" || state?.payload === undefined) return;
    if (isSkippedSchemaReportPayload(state.payload)) return;
    const context: JsonRecord = readReportContext(contexts, report.id) ?? {};
    const target = targetForReport(report, bindings, context);
    if (!target) return;
    storeReportPayload(reports, report.id, target, state.payload);
    results = results.map((result) => {
      if (!isRecord(result)) return result;
      const sameModel = contextId(result.modelId) === contextId(context.modelId);
      return sameModel ? patchResultOutput(result, report.id, target, state.payload) : result;
    });
  });

  return {
    raw: { ...raw, reports, results },
    reportsPending: hasPendingReports(formReports, reportStates, skippedReportIds),
  };
};

export const reportStatesFromSnapshot = (value: unknown): Record<string, ReportState> =>
  isRecord(value) ? (value as Record<string, ReportState>) : {};
