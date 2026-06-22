/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeCustomReportResult } from "../../plugin/custom-report-result";
import { toMlformSchema } from "../../mlform/schema-validation";
import { DEFAULT_REPORT_FEEDBACK_QUESTIONNAIRE } from "./default-report-feedback-questionnaire";
import type { ReportConfig } from "mlform/runtime";
import type { PredictionReportDescriptor } from "../questionnaire-feedback";
import type { QuestionnaireSchema } from "../questionnaire-schema";

type JsonRecord = Record<string, unknown>;

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** stripTreeToken: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const stripTreeToken = (value: string): string =>
  value
    .trim()
    .replace(/^[*\d.)\-\s]+/, "")
    .replace(/^[|_\\/\->:\s]+/, "")
    .trim();

/** formatReportTree: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const formatReportTree = (value: string): string => {
  const parts = value.split(/(?:\s*\|\s*){2,}/).reduce<string[]>((items, part) => {
    const stripped = stripTreeToken(part);
    if (stripped.length > 0) {
      items.push(stripped);
    }
    return items;
  }, []);

  if (parts.length === 0) {
    return value.trim();
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return parts
    .map((part, index) => {
      if (index === 0) {
        return part;
      }

      const indent = "  ".repeat(index - 1);
      return `${indent}└─ ${part}`;
    })
    .join("\n");
};

/** normalizeDisplayedReportContent: internal normalization helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const normalizeDisplayedReportContent = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("|__") || trimmed.includes("||") || trimmed.startsWith("*")) {
    return formatReportTree(trimmed);
  }

  return trimmed;
};

/** getReportContent: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getReportContent = (payload: unknown): string[] => {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return [payload];
  }
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  const reportPayload = isRecord(payload) ? payload : null;
  const contentFromFormattedPayload =
    typeof reportPayload?.explanation === "string" && reportPayload.explanation.trim().length > 0
      ? [reportPayload.explanation]
      : [];
  const normalizedReport = reportPayload ? normalizeCustomReportResult(reportPayload) : null;

  if (contentFromFormattedPayload.length > 0) {
    return contentFromFormattedPayload;
  }

  return normalizedReport
    ? [
        ...normalizedReport.blocks,
        ...(normalizedReport.html ? [normalizedReport.html] : []),
        ...(normalizedReport.jsonFallback ? [normalizedReport.jsonFallback] : []),
      ].filter((item) => item.trim().length > 0)
    : [];
};

/**
 * getFormattedReportContent: extracts a derived value without mutating input
 *
 * Purpose: extracts and formats report content for feedback/review display.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getFormattedReportContent = (payload: unknown): string[] =>
  getReportContent(payload).map((item) => normalizeDisplayedReportContent(item));

/** getMetadataFeedbackQuestionnaire: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getMetadataFeedbackQuestionnaire = (
  report: Record<string, unknown>,
): QuestionnaireSchema | undefined =>
  report.feedbackEnabled === true ? DEFAULT_REPORT_FEEDBACK_QUESTIONNAIRE : undefined;

/** getEmbeddedFeedbackQuestionnaire: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getEmbeddedFeedbackQuestionnaire = (
  report: ReportConfig,
): QuestionnaireSchema | undefined => {
  const value = (report as Record<string, unknown>).feedbackQuestionnaire;
  return isRecord(value) && Array.isArray(value.steps) ? (value as QuestionnaireSchema) : undefined;
};

/** getFallbackReportEntries: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getFallbackReportEntries = (predictionValue: unknown): PredictionReportDescriptor[] => {
  if (!isRecord(predictionValue)) {
    return [];
  }

  const reports = Array.isArray(predictionValue.reports) ? predictionValue.reports : [];
  const fallbackReportEntries = reports
    .filter(isRecord)
    .map((item, index) => ({
      reportId: typeof item.id === "string" ? item.id : `report-${index + 1}`,
      payload: "payload" in item ? item.payload : item,
    }))
    .filter(({ payload }) => {
      if (!isRecord(payload)) {
        return false;
      }
      const normalized = normalizeCustomReportResult(payload);
      return (
        normalized.blocks.length > 0 || normalized.html !== null || normalized.jsonFallback !== null
      );
    });
  return fallbackReportEntries.flatMap(({ reportId, payload }, index) => {
    const content = getReportContent(payload);
    if (content.length === 0) {
      return [];
    }

    return [
      {
        order: index,
        reportId,
        label: reportId,
        content: content.map((item) => normalizeDisplayedReportContent(item)),
        error: null,
      },
    ];
  });
};

/** getEmbeddedSchemaReportEntries: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getEmbeddedSchemaReportEntries = (
  predictionValue: unknown,
  schemaDefinition: unknown,
): PredictionReportDescriptor[] => {
  if (
    !isRecord(predictionValue) ||
    !isRecord(schemaDefinition) ||
    !Array.isArray(schemaDefinition.reports)
  ) {
    return [];
  }

  const reports = Array.isArray(predictionValue.reports)
    ? predictionValue.reports.filter(isRecord)
    : [];

  return schemaDefinition.reports.flatMap((item, index) => {
    if (!isRecord(item)) {
      return [];
    }
    const feedbackQuestionnaire =
      getEmbeddedFeedbackQuestionnaire(item as ReportConfig) ??
      getMetadataFeedbackQuestionnaire(item);
    if (!feedbackQuestionnaire && item.feedbackEnabled !== false) {
      return [];
    }

    const reportId =
      typeof item.id === "string" && item.id.trim().length > 0 ? item.id : `report-${index + 1}`;
    const reportPayload = reports.find((report) => String(report.id) === reportId);
    const content = getReportContent(
      reportPayload && "payload" in reportPayload ? reportPayload.payload : reportPayload,
    );
    if (content.length === 0 && !feedbackQuestionnaire) {
      return [];
    }
    return [
      {
        order: index,
        reportId,
        label: typeof item.label === "string" ? item.label : reportId,
        content: content.map((value) => normalizeDisplayedReportContent(value)),
        error: null,
        feedbackQuestionnaire,
      },
    ];
  });
};

/**
 * extractPredictionReportEntries: performs the exported transformation for this algorithm.
 *
 * Purpose: extracts and formats report content for feedback/review display.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const extractPredictionReportEntries = (
  predictionValue: unknown,
  schemaDefinition?: unknown,
): PredictionReportDescriptor[] => {
  if (!isRecord(predictionValue)) {
    return [];
  }

  try {
    const schema = toMlformSchema(schemaDefinition);
    const feedbackReports = (schema.reports ?? []).filter(
      (report: ReportConfig) =>
        getEmbeddedFeedbackQuestionnaire(report) !== undefined ||
        (report as Record<string, unknown>).feedbackEnabled === true,
    );
    if (feedbackReports.length === 0) {
      return getFallbackReportEntries(predictionValue);
    }
    const reports = Array.isArray(predictionValue.reports)
      ? predictionValue.reports.filter(isRecord)
      : [];

    return feedbackReports.flatMap((report: ReportConfig, index: number) => {
      const reportId = report.id ?? `report-${index + 1}`;
      const reportPayload = reports.find((item) => String(item.id) === reportId);
      const content = getReportContent(
        reportPayload && "payload" in reportPayload ? reportPayload.payload : reportPayload,
      );
      const feedbackQuestionnaire =
        getEmbeddedFeedbackQuestionnaire(report) ??
        getMetadataFeedbackQuestionnaire(report as Record<string, unknown>);

      if (content.length === 0 && !feedbackQuestionnaire) {
        return [];
      }

      return [
        {
          order: index,
          reportId,
          label: report.label ?? reportId,
          content: content.map((item) => normalizeDisplayedReportContent(item)),
          error: null,
          feedbackQuestionnaire,
        },
      ];
    });
  } catch {
    const embeddedEntries = getEmbeddedSchemaReportEntries(predictionValue, schemaDefinition);
    return embeddedEntries.length > 0 ? embeddedEntries : getFallbackReportEntries(predictionValue);
  }
};
