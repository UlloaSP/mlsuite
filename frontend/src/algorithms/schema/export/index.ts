/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isBuiltinReportKind } from "../../mlform/builtin-registry";
import { csvEscape, toCell } from "../../../algorithms/models/export-csv";
import { getOutputFeedbackFieldIds } from "../../../algorithms/models/output-feedback-questionnaire";
import { getQuestionnaireFieldIds } from "../../models/questionnaire-feedback";
import type { QuestionnaireSchema } from "../../models/questionnaire-schema";
import { getFormattedReportContent } from "../../models/report-feedback-utils";
import { formatTimestamp } from "../../models/utils";
import { getSchemaResultReports, type SchemaDisplayReport } from "../report-display";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "../../../schemas/types";

/** safeFilePart: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const safeFilePart = (value: string): string =>
  value
    .replace(/[^a-z0-9\-_.]+/gi, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 80);

/** reviewerLabel: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reviewerLabel = (item: PredictionResultFeedbackDto): string =>
  item.userEmail || item.userName || `user-${item.userId ?? "unknown"}`;

/** feedbackRecord: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const feedbackRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };

/** reportsOf: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportsOf = (schema: unknown): Record<string, unknown>[] =>
  typeof schema === "object" &&
  schema !== null &&
  !Array.isArray(schema) &&
  Array.isArray((schema as { reports?: unknown }).reports)
    ? (schema as { reports: unknown[] }).reports.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];

/** modelInputColumn: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const modelInputColumn = (modelId: string, key: string): string => `input.${modelId}.${key}`;

/** reportColumnId: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportColumnId = (report: SchemaDisplayReport): string => report.id;

/** outputAt: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const outputAt = (
  output: Record<string, unknown>,
  order: number,
): Record<string, unknown> | null => {
  const outputs = Array.isArray(output.outputs) ? output.outputs : [];
  const item = outputs[order];
  return typeof item === "object" && item !== null && !Array.isArray(item)
    ? (item as Record<string, unknown>)
    : null;
};

/** predictionValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const predictionValue = (report: SchemaDisplayReport, output: Record<string, unknown>): unknown => {
  const payload = feedbackRecord(report.payload);
  const rawPrediction =
    payload.prediction ?? payload.value ?? outputAt(output, report.order)?.prediction;
  if (typeof rawPrediction === "number") return report.labels?.[rawPrediction] ?? rawPrediction;
  if (typeof rawPrediction === "string" && /^\d+$/.test(rawPrediction)) {
    const index = Number(rawPrediction);
    return report.labels?.[index] ?? rawPrediction;
  }
  return rawPrediction ?? report.payload;
};

/** outputFeedbackValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const outputFeedbackValue = (record: Record<string, unknown>, kind: string): unknown => {
  const fieldIds = getOutputFeedbackFieldIds(kind);
  return record[fieldIds.assessment] ?? record.assessment ?? Object.values(record)[0];
};

/** reportContentValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportContentValue = (payload: unknown): string => {
  const formatted = getFormattedReportContent(payload);
  return formatted.length > 0 ? formatted.join("\n\n") : toCell(payload);
};

/** reportContentColumn: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportContentColumn = (reportId: string): string => `report.${reportId}.content`;

/** reportFeedbackColumn: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportFeedbackColumn = (reportId: string, fieldId: string, reviewer: string): string =>
  `report.${reportId}.${fieldId}.${reviewer}`;

/** outputPredictionColumn: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const outputPredictionColumn = (reportId: string): string => `output.${reportId}.predicted`;

/** outputFeedbackColumn: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const outputFeedbackColumn = (reportId: string, reviewer: string): string =>
  `output.${reportId}.feedback.${reviewer}`;

/** getSchemaRunModelInputColumns: internal lookup helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getSchemaRunModelInputColumns = (runs: readonly PredictionRunDto[]): string[] =>
  Array.from(
    new Set(
      runs.flatMap((run) =>
        run.results.flatMap((result) =>
          Object.keys(result.modelInput).map((key) => modelInputColumn(result.modelId, key)),
        ),
      ),
    ),
  ).sort();

/** getSchemaRunModelInputValues: internal lookup helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getSchemaRunModelInputValues = (run: PredictionRunDto): Map<string, unknown> =>
  run.results.reduce<Map<string, unknown>>((values, result) => {
    Object.entries(result.modelInput).forEach(([key, value]) => {
      values.set(modelInputColumn(result.modelId, key), value);
    });
    return values;
  }, new Map());

/**
 * buildSchemaRunExport: constructs a new derived object from source data
 *
 * Purpose: builds and downloads schema-run CSV exports.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const buildSchemaRunExport = (
  runs: readonly PredictionRunDto[],
  version: SchemaVersionDto,
  feedback: readonly PredictionResultFeedbackDto[] = [],
  delimiter = ",",
): { content: string; fileName: string } => {
  const inputLabels = getSchemaRunModelInputColumns(runs);
  const displayReports = runs.flatMap((run) =>
    run.results.flatMap((result) => getSchemaResultReports(version, result)),
  );
  const reportIds = Array.from(new Set(displayReports.map(reportColumnId)));
  const reviewers = Array.from(new Set(feedback.map(reviewerLabel))).sort();
  const reportConfigs = reportsOf(version.formSchema);
  const outputHeaders = reportIds.flatMap((reportId) => {
    const report = displayReports.find((item) => item.id === reportId);
    if (!report || !isBuiltinReportKind(report.kind)) return [];
    return [
      outputPredictionColumn(reportId),
      ...reviewers.map((reviewer) => outputFeedbackColumn(reportId, reviewer)),
    ];
  });
  const reportHeaders = reportIds.flatMap((reportId) => {
    const config = reportConfigs.find((item) => item.id === reportId);
    const questionnaire = config?.feedbackQuestionnaire;
    const schemaFields =
      typeof questionnaire === "object" && questionnaire !== null
        ? getQuestionnaireFieldIds(questionnaire as QuestionnaireSchema)
        : [];
    if (schemaFields.length === 0) return [];
    return [
      reportContentColumn(reportId),
      ...schemaFields.flatMap((field) =>
        reviewers.map((reviewer) => reportFeedbackColumn(reportId, field, reviewer)),
      ),
    ];
  });
  const headers = [
    "inference_name",
    "run_id",
    "run_status",
    "created_at",
    "model_count",
    ...inputLabels,
    ...outputHeaders,
    ...reportHeaders,
  ];
  const rows = runs.map((run) => {
    const inputs = getSchemaRunModelInputValues(run);
    const outputs = new Map<string, string>();
    const reportContent = new Map<string, string>();
    const outputFeedback = new Map<string, string>();
    const reportFeedback = new Map<string, string>();
    run.results.forEach((result) => {
      getSchemaResultReports(version, result).forEach((report) => {
        const reportId = reportColumnId(report);
        const config = reportConfigs.find((item) => item.id === reportId);
        if (isBuiltinReportKind(report.kind)) {
          outputs.set(
            outputPredictionColumn(reportId),
            toCell(predictionValue(report, result.output)),
          );
        }
        if (config?.feedbackQuestionnaire) {
          reportContent.set(reportContentColumn(reportId), reportContentValue(report.payload));
        }
        reviewers.forEach((reviewer) => {
          const matches = feedback.filter(
            (item) =>
              item.resultId === result.id &&
              item.order === report.order &&
              reviewerLabel(item) === reviewer,
          );
          matches.forEach((item) => {
            const record = feedbackRecord(item.value);
            if (item.type === "OUTPUT") {
              outputFeedback.set(
                outputFeedbackColumn(reportId, reviewer),
                toCell(outputFeedbackValue(record, report.kind)),
              );
              return;
            }
            Object.entries(record).forEach(([field, value]) =>
              reportFeedback.set(reportFeedbackColumn(reportId, field, reviewer), toCell(value)),
            );
          });
        });
      });
    });
    return [
      run.name,
      run.id,
      run.status,
      formatTimestamp(run.createdAt),
      String(run.results.length),
      ...inputLabels.map((label) => toCell(inputs.get(label))),
      ...outputHeaders.map((label) => outputs.get(label) ?? outputFeedback.get(label) ?? ""),
      ...reportHeaders.map((label) => reportContent.get(label) ?? reportFeedback.get(label) ?? ""),
    ];
  });
  const content = `\uFEFF${headers.map((item) => csvEscape(item, delimiter)).join(delimiter)}\n${rows
    .map((row) => row.map((item) => csvEscape(String(item), delimiter)).join(delimiter))
    .join("\n")}`;
  return {
    content,
    fileName: `${safeFilePart(version.name || "schema-runs")}_${new Date().toISOString().slice(0, 10)}.csv`,
  };
};

/**
 * downloadSchemaRunExport: creates a browser download side effect from prepared export data
 *
 * Purpose: builds and downloads schema-run CSV exports.
 * @returns void after starting browser download work.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Creates Blob/object URL download state; empty rows still produce a header-only CSV when headers exist.
 */
export const downloadSchemaRunExport = (
  runs: readonly PredictionRunDto[],
  version: SchemaVersionDto,
  feedback: readonly PredictionResultFeedbackDto[] = [],
): void => {
  const { content, fileName } = buildSchemaRunExport(runs, version, feedback);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
