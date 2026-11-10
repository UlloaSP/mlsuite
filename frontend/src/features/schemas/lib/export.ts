/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { resolveDisplayKey } from "@/capabilities/prediction-runtime/mlform/display-key";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { csvEscape, toCell } from "@/capabilities/prediction-runtime/data/export-csv";
import {
  builtinPrediction,
  classLabel,
} from "@/capabilities/prediction-runtime/data/report-normalization";
import { getOutputFeedbackFieldIds } from "@/capabilities/prediction-runtime/feedback/output-feedback-questionnaire";
import {
  getQuestionnaireFieldDescriptors,
  getQuestionnaireFieldIds,
  type QuestionnaireFieldDescriptor,
} from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { QuestionnaireSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import { getFormattedReportContent } from "@/capabilities/prediction-runtime/feedback/report-feedback-utils";
import { formatTimestamp } from "@/shared/lib/date-time";
import {
  getSchemaResultReports,
  type SchemaDisplayReport,
} from "@/capabilities/prediction-runtime/data/report-display";
import { downloadTextFile } from "@/shared/lib/download-text-file";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

const safeFilePart = (value: string): string =>
  value
    .replace(/[^a-z0-9\-_.]+/gi, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 80);

export const schemaRunReviewerLabel = (item: PredictionResultFeedbackDto): string =>
  item.createdByEmail ||
  item.createdByName ||
  (item.createdByUserId == null ? "Visitor" : `user-${item.createdByUserId}`);

const feedbackRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };

const modelInputColumn = (modelId: number, key: string): string => `input.${modelId}.${key}`;

const reportColumnId = (report: SchemaDisplayReport): string => report.id;

const predictionValue = (report: SchemaDisplayReport): unknown => {
  const payload = feedbackRecord(report.payload);
  return builtinPrediction(payload) ?? report.payload;
};

/** A reviewer's assessment, a class written as the predicted class beside it is: by its schema label. */
const outputFeedbackValue = (
  record: Record<string, unknown>,
  report: SchemaDisplayReport,
): unknown => {
  const fieldIds = getOutputFeedbackFieldIds(report.kind);
  const value = record[fieldIds.assessment] ?? record.assessment ?? Object.values(record)[0];
  return report.kind === "classifier"
    ? classLabel(report.labels ?? [], report.classes ?? [], value)
    : value;
};

const questionnaireOf = (report: SchemaDisplayReport | undefined): unknown =>
  report?.config.feedbackQuestionnaire;

const questionnaireFields = (
  report: SchemaDisplayReport,
): Map<string, QuestionnaireFieldDescriptor> => {
  const questionnaire = questionnaireOf(report);
  if (typeof questionnaire !== "object" || questionnaire === null) return new Map();
  return new Map(
    getQuestionnaireFieldDescriptors(questionnaire as QuestionnaireSchema).map((field) => [
      field.id,
      field,
    ]),
  );
};

/** An answer as the inference table shows it: a choice by its option's label, compared as text. */
const questionnaireAnswer = (
  value: unknown,
  field: QuestionnaireFieldDescriptor | undefined,
): unknown =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? (field?.options?.find((option) => toCell(option.value) === String(value))?.label ?? value)
    : value;

const reportContentValue = (payload: unknown): string => {
  const formatted = getFormattedReportContent(payload);
  return formatted.length > 0 ? formatted.join("\n\n") : toCell(payload);
};

const reportContentColumn = (reportId: string): string => `report.${reportId}.content`;

const reportFeedbackColumn = (reportId: string, fieldId: string, reviewer: string): string =>
  `report.${reportId}.${fieldId}.${reviewer}`;

const outputPredictionColumn = (reportId: string): string => `output.${reportId}.predicted`;

const outputFeedbackColumn = (reportId: string, reviewer: string): string =>
  `output.${reportId}.feedback.${reviewer}`;

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

const getSchemaRunModelInputValues = (run: PredictionRunDto): Map<string, unknown> =>
  run.results.reduce<Map<string, unknown>>((values, result) => {
    Object.entries(result.modelInput).forEach(([key, value]) => {
      values.set(modelInputColumn(result.modelId, key), value);
    });
    return values;
  }, new Map());

/**
 * The display keys of the shown series fields: a run keeps their rows under these, and their
 * models may receive only aggregations of them, so the rows have columns of their own.
 */
const getSeriesKeys = (version: SchemaVersionDto): string[] =>
  (Array.isArray(version.formSchema.fields) ? version.formSchema.fields : [])
    .filter(isRecord)
    .filter((field) => field.kind === "series" && field.hidden !== true)
    .flatMap((field) => resolveDisplayKey(field) ?? []);

const seriesColumn = (key: string): string => `series.${key}`;

export const buildSchemaRunExport = (
  runs: readonly PredictionRunDto[],
  version: SchemaVersionDto,
  feedback: readonly PredictionResultFeedbackDto[] = [],
  delimiter = ",",
): { content: string; fileName: string } => {
  const inputLabels = getSchemaRunModelInputColumns(runs);
  const seriesKeys = getSeriesKeys(version);
  const displayReports = runs.flatMap((run) =>
    run.results.flatMap((result) => getSchemaResultReports(version, result)),
  );
  const reportIds = Array.from(new Set(displayReports.map(reportColumnId)));
  const reviewers = Array.from(new Set(feedback.map(schemaRunReviewerLabel))).sort();
  const outputHeaders = reportIds.flatMap((reportId) => {
    const report = displayReports.find((item) => item.id === reportId);
    if (!report || !isBuiltinReportKind(report.kind)) return [];
    return [
      outputPredictionColumn(reportId),
      ...reviewers.map((reviewer) => outputFeedbackColumn(reportId, reviewer)),
    ];
  });
  const reportHeaders = reportIds.flatMap((reportId) => {
    const questionnaire = questionnaireOf(displayReports.find((item) => item.id === reportId));
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
    "origin",
    "created_by",
    "model_count",
    ...inputLabels,
    ...seriesKeys.map(seriesColumn),
    ...outputHeaders,
    ...reportHeaders,
  ];
  const rows = runs.map((run) => {
    const inputs = getSchemaRunModelInputValues(run);
    const builtInReportValues = new Map<string, string>();
    const reportContent = new Map<string, string>();
    const outputFeedback = new Map<string, string>();
    const reportFeedback = new Map<string, string>();
    run.results.forEach((result) => {
      getSchemaResultReports(version, result).forEach((report) => {
        const reportId = reportColumnId(report);
        if (isBuiltinReportKind(report.kind)) {
          builtInReportValues.set(
            outputPredictionColumn(reportId),
            toCell(predictionValue(report)),
          );
        }
        if (questionnaireOf(report)) {
          reportContent.set(reportContentColumn(reportId), reportContentValue(report.payload));
        }
        const fields = questionnaireFields(report);
        reviewers.forEach((reviewer) => {
          const matches = feedback.filter(
            (item) =>
              item.resultId === result.id &&
              item.order === report.order &&
              schemaRunReviewerLabel(item) === reviewer,
          );
          matches.forEach((item) => {
            const record = feedbackRecord(item.value);
            if (item.type === "OUTPUT") {
              outputFeedback.set(
                outputFeedbackColumn(reportId, reviewer),
                toCell(outputFeedbackValue(record, report)),
              );
              return;
            }
            Object.entries(record).forEach(([field, value]) =>
              reportFeedback.set(
                reportFeedbackColumn(reportId, field, reviewer),
                toCell(questionnaireAnswer(value, fields.get(field))),
              ),
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
      run.origin,
      run.createdByName || run.createdByEmail || "",
      String(run.results.length),
      ...inputLabels.map((label) => toCell(inputs.get(label))),
      ...seriesKeys.map((key) => toCell(run.inputData[key])),
      ...outputHeaders.map(
        (label) => builtInReportValues.get(label) ?? outputFeedback.get(label) ?? "",
      ),
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

export const downloadSchemaRunExport = (
  runs: readonly PredictionRunDto[],
  version: SchemaVersionDto,
  feedback: readonly PredictionResultFeedbackDto[] = [],
): void => {
  const { content, fileName } = buildSchemaRunExport(runs, version, feedback);
  downloadTextFile(content, fileName, "text/csv");
};
