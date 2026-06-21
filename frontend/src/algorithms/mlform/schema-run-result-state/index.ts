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
import { schemaRunDebug } from "../../schema/run-debug";

type ReportState = {
  status?: string;
  payload?: unknown;
  error?: unknown;
};

type ReportController = {
  id: string;
  kind?: string;
  state?: ReportState;
  mappedTo?: unknown;
};

type Binding = {
  modelId: string;
  modelName?: string;
};

/** statusOf: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const statusOf = (state: ReportState | undefined): string => state?.status ?? "idle";

/** contextId: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const contextId = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

/** hasPendingReports: internal predicate for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const hasPendingReports = (
  reports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
  skippedReportIds: ReadonlySet<string>,
  completedReportIds: ReadonlySet<string>,
): boolean =>
  reports.some((report) => {
    if (completedReportIds.has(reportContextKey(report.id)) || completedReportIds.has(report.id)) {
      return false;
    }
    if (skippedReportIds.has(reportContextKey(report.id)) || skippedReportIds.has(report.id)) {
      return false;
    }
    const status = statusOf(reportStates[report.id] ?? report.state);
    const payload = (reportStates[report.id] ?? report.state)?.payload;
    if (isSkippedSchemaReportPayload(payload)) return false;
    return status === "idle" || status === "loading";
  });

/** targetForReport: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const targetForReport = (
  report: ReportController,
  bindings: readonly Binding[],
  context: JsonRecord,
): string | undefined => {
  const modelId = contextId(context.modelId);
  const binding = bindings.find((item) => contextId(item.modelId) === modelId);
  return reportTargetForBinding(report, binding);
};

/** patchResultOutput: internal transformation helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

const reportPayloadFor = (reports: readonly JsonRecord[], reportId: string): unknown => {
  const item = reports.find(
    (report) => String(report.id) === reportId || reportContextKey(String(report.id)) === reportId,
  );
  if (!item) return undefined;
  return "payload" in item ? item.payload : item;
};

/**
 * buildSchemaRunRawFromSubmitResult: constructs a new derived object from source data
 *
 * Purpose: rebuilds schema-run raw result and report-state snapshots after MLForm submission.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const buildSchemaRunRawFromSubmitResult = (
  raw: JsonRecord,
  formReports: readonly ReportController[],
  reportStates: Record<string, ReportState>,
  bindings: readonly Binding[],
): { raw: JsonRecord; reportsPending: boolean } => {
  const contexts = isRecord(raw.reportContextById) ? raw.reportContextById : {};
  const reports = Array.isArray(raw.reports) ? raw.reports.filter(isRecord) : [];
  const skippedReportIds = new Set(
    Array.isArray(raw[skippedReportIdsKey]) ? raw[skippedReportIdsKey].map(String) : [],
  );
  const completedReportIds = new Set<string>();
  let results = Array.isArray(raw.results) ? [...raw.results] : [];
  schemaRunDebug("result-state.start", {
    raw,
    formReports,
    reportStates,
    bindings,
    contexts,
    skippedReportIds: [...skippedReportIds],
  });

  formReports.forEach((report) => {
    const state = reportStates[report.id] ?? report.state;
    const payload =
      statusOf(state) === "ready" && state?.payload !== undefined
        ? state.payload
        : reportPayloadFor(reports, report.id);
    schemaRunDebug("result-state.report", { report, state, payload });
    if (payload === undefined) return;
    completedReportIds.add(report.id);
    completedReportIds.add(reportContextKey(report.id));
    if (isSkippedSchemaReportPayload(payload)) {
      schemaRunDebug("result-state.report-skipped", { reportId: report.id, payload });
      return;
    }
    const context: JsonRecord = readReportContext(contexts, report.id) ?? {};
    const target = targetForReport(report, bindings, context) ?? contextId(context.target);
    schemaRunDebug("result-state.target", { reportId: report.id, context, target });
    if (!target) return;
    if (reports.some((item) => String(item.mappedTo) === target && !("payload" in item))) return;
    const nextItem = { id: report.id, kind: report.kind, mappedTo: target, payload };
    const existingIndex = reports.findIndex((item) => String(item.id) === report.id);
    if (existingIndex >= 0) reports[existingIndex] = nextItem;
    else reports.push(nextItem);
    results = results.map((result) => {
      if (!isRecord(result)) return result;
      const sameModel = contextId(result.modelId) === contextId(context.modelId);
      return sameModel
        ? patchResultOutput(result, report.id, report.kind, target, payload)
        : result;
    });
  });

  const next = {
    raw: { ...raw, reports, results },
    reportsPending: hasPendingReports(
      formReports,
      reportStates,
      skippedReportIds,
      completedReportIds,
    ),
  };
  schemaRunDebug("result-state.done", {
    next,
    completedReportIds: [...completedReportIds],
    reportCount: reports.length,
  });
  return next;
};

/**
 * reportStatesFromSnapshot: performs the exported transformation for this algorithm.
 *
 * Purpose: rebuilds schema-run raw result and report-state snapshots after MLForm submission.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const reportStatesFromSnapshot = (value: unknown): Record<string, ReportState> =>
  isRecord(value) ? (value as Record<string, ReportState>) : {};
