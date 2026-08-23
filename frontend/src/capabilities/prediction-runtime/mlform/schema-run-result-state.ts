/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportContext } from "mlform/schema";
import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import { schemaRunDebug } from "@/capabilities/prediction-runtime/mlform/run-debug";

type ReportState = { status?: string; payload?: unknown; error?: unknown };

type ReportController = {
  id: string;
  kind?: string;
  state?: ReportState;
  mappedTo?: unknown;
  config?: { mappedTo?: unknown };
};

type Binding = { modelId: string; modelName?: string };

const statusOf = (state: ReportState | undefined): string => state?.status ?? "idle";

const contextId = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const hasPendingReports = (
  reports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
): boolean =>
  reports.some((report) => {
    const status = statusOf(reportStates[report.id] ?? report.state);
    return status === "idle" || status === "loading";
  });

const targetForReport = (
  report: ReportController,
  bindings: readonly Binding[],
  context: ReportContext | undefined,
): string | undefined => {
  if (context?.target !== undefined) return String(context.target);
  const modelId = contextId(context?.meta.modelId);
  const binding = bindings.find((item) => item.modelId === modelId);
  return reportTargetForBinding(report.config ?? report, binding);
};

export const mergeReportFetchResults = (
  reportStates: Record<string, ReportState>,
  reportFetchResults: unknown,
): Record<string, ReportState> => {
  if (!isRecord(reportFetchResults)) return reportStates;
  const next = { ...reportStates };
  Object.entries(reportFetchResults).forEach(([id, payload]) => {
    next[id] = { ...next[id], status: "ready", payload };
  });
  return next;
};

const patchResultOutput = (
  result: unknown,
  reportId: string,
  kind: string | undefined,
  target: string,
  payload: unknown,
): unknown => {
  if (!isRecord(result)) return result;
  const output = isRecord(result.output) ? result.output : {};
  const reports = Array.isArray(output.reports) ? output.reports.filter(isRecord) : [];
  const item = { id: reportId, kind, mappedTo: target, payload };
  return {
    ...result,
    output: {
      ...output,
      reports: [...reports.filter((report) => String(report.id) !== reportId), item],
    },
  };
};

export const buildSchemaRunRawFromSubmitResult = (
  raw: JsonRecord,
  formReports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
  bindings: readonly Binding[],
  reportContexts: Readonly<Record<string, ReportContext>> = {},
): { raw: JsonRecord; reportsPending: boolean } => {
  const transportReports = Array.isArray(raw.reports) ? raw.reports.filter(isRecord) : [];
  let results = Array.isArray(raw.results) ? [...raw.results] : [];
  const reports = results.flatMap((result) => {
    if (!isRecord(result) || !isRecord(result.output) || !Array.isArray(result.output.reports)) {
      return [];
    }
    return result.output.reports.filter(isRecord);
  });

  formReports.forEach((report) => {
    const state = reportStates[report.id] ?? report.state;
    if (statusOf(state) !== "ready" || state?.payload === undefined) return;
    const context = reportContexts[report.id];
    const target = targetForReport(report, bindings, context);
    if (!target) return;
    const transportResult = transportReports.find(
      (item) => item.backend === context?.backend && String(item.mappedTo) === target,
    );
    if (transportResult?.status === "ready") return;
    const item = { id: report.id, kind: report.kind, mappedTo: target, payload: state.payload };
    reports.push(item);
    const modelId = contextId(context?.meta.modelId);
    results = results.map((result) =>
      isRecord(result) && contextId(result.modelId) === modelId
        ? patchResultOutput(result, report.id, report.kind, target, state.payload)
        : result,
    );
  });

  const next = {
    raw: { ...raw, reports, results },
    reportsPending: hasPendingReports(formReports, reportStates),
  };
  schemaRunDebug("result-state.done", next);
  return next;
};

export const reportStatesFromSnapshot = (value: unknown): Record<string, ReportState> =>
  isRecord(value) ? (value as Record<string, ReportState>) : {};
