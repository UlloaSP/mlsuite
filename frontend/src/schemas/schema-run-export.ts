/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { csvEscape, toCell } from "../models/components/export-csv-utils";
import { getQuestionnaireFieldIds } from "../models/questionnaire-feedback";
import type { QuestionnaireSchema } from "../models/questionnaire-schema";
import { formatTimestamp } from "../models/utils";
import { getSchemaResultReports } from "./schema-run-display";
import type { PredictionResultFeedbackDto, PredictionRunDto, SchemaVersionDto } from "./types";

const safeFilePart = (value: string): string =>
  value.replace(/[^a-z0-9\-_.]+/gi, "_").replace(/_{2,}/g, "_").slice(0, 80);

const reviewerLabel = (item: PredictionResultFeedbackDto): string =>
  item.userEmail || item.userName || `user-${item.userId ?? "unknown"}`;

const feedbackRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };

const reportsOf = (schema: unknown): Record<string, unknown>[] =>
  typeof schema === "object" &&
  schema !== null &&
  !Array.isArray(schema) &&
  Array.isArray((schema as { reports?: unknown }).reports)
    ? ((schema as { reports: unknown[] }).reports.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      ))
    : [];

const modelInputColumn = (modelId: string, key: string): string => `input.${modelId}.${key}`;

export const getSchemaRunModelInputColumns = (
  runs: readonly PredictionRunDto[],
): string[] =>
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

export const buildSchemaRunExport = (
  runs: readonly PredictionRunDto[],
  version: SchemaVersionDto,
  feedback: readonly PredictionResultFeedbackDto[] = [],
  delimiter = ",",
): { content: string; fileName: string } => {
  const inputLabels = getSchemaRunModelInputColumns(runs);
  const reportLabels = Array.from(
    new Set(
      runs.flatMap((run) =>
        run.results.flatMap((result) =>
          getSchemaResultReports(version, result).map((report) => report.label),
        ),
      ),
    ),
  );
  const reviewers = Array.from(new Set(feedback.map(reviewerLabel))).sort();
  const reportConfigs = reportsOf(version.formSchema);
  const feedbackLabels = reportLabels.flatMap((reportLabel) => {
    const config = reportConfigs.find((item) => item.label === reportLabel || item.id === reportLabel);
    const questionnaire = config?.feedbackQuestionnaire;
    const schemaFields =
      typeof questionnaire === "object" && questionnaire !== null
        ? getQuestionnaireFieldIds(questionnaire as QuestionnaireSchema)
        : [];
    const valueFields = feedback
      .filter((item) =>
        runs.some((run) =>
          run.results.some((result) =>
            result.id === item.resultId &&
            getSchemaResultReports(version, result).some(
              (report) => report.order === item.order && report.label === reportLabel,
            ),
          ),
        ),
      )
      .flatMap((item) => Object.keys(feedbackRecord(item.value)));
    const fields = Array.from(new Set([...schemaFields, ...valueFields, "value"]));
    return reviewers.flatMap((reviewer) =>
      fields.map((field) => `${reportLabel}.feedback.${reviewer}.${field}`),
    );
  });
  const headers = [
    "inference_name",
    "run_id",
    "run_status",
    "created_at",
    "model_count",
    ...inputLabels,
    ...reportLabels,
    ...feedbackLabels,
  ];
  const rows = runs.map((run) => {
    const inputs = getSchemaRunModelInputValues(run);
    const reports = new Map<string, string>();
    const reportFeedback = new Map<string, string>();
    run.results.forEach((result) => {
      getSchemaResultReports(version, result).forEach((report) => {
        reports.set(report.label, toCell(report.payload));
        reviewers.forEach((reviewer) => {
          const matches = feedback.filter(
            (item) =>
              item.resultId === result.id &&
              item.order === report.order &&
              reviewerLabel(item) === reviewer,
          );
          matches.forEach((item) => {
            const record = feedbackRecord(item.value);
            Object.entries(record).forEach(([field, value]) => {
              reportFeedback.set(`${report.label}.feedback.${reviewer}.${field}`, toCell(value));
            });
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
      ...reportLabels.map((label) => reports.get(label) ?? ""),
      ...feedbackLabels.map((label) => reportFeedback.get(label) ?? ""),
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
