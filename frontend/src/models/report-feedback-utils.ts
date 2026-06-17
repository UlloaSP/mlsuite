/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeCustomReportResult } from "../plugin/mlform/custom-report-result";
import { toMlformSchema } from "../app/utils/mlform/schema-validation";
import type { ReportConfig } from "mlform/runtime";
import type { PredictionReportDescriptor } from "./questionnaire-feedback";
import type { QuestionnaireSchema } from "./questionnaire-schema";

type JsonRecord = Record<string, unknown>;

type LegacyExplanationPayload = {
  explanation?: unknown;
  explanations?: unknown;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripTreeToken = (value: string): string =>
  value
    .trim()
    .replace(/^[*\d.)\-\s]+/, "")
    .replace(/^[|_\\/\->:\s]+/, "")
    .trim();

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

const getReportContent = (payload: unknown): string[] => {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return [payload];
  }
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  const reportPayload = isRecord(payload) ? (payload as LegacyExplanationPayload) : null;
  const contentFromFormattedPayload =
    typeof reportPayload?.explanation === "string" && reportPayload.explanation.trim().length > 0
      ? [reportPayload.explanation]
      : [];
  const contentFromLegacyPayload =
    reportPayload && Array.isArray(reportPayload.explanations)
      ? reportPayload.explanations.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];
  const normalizedReport = reportPayload ? normalizeCustomReportResult(reportPayload) : null;

  if (contentFromFormattedPayload.length > 0) {
    return contentFromFormattedPayload;
  }

  if (contentFromLegacyPayload.length > 0) {
    return contentFromLegacyPayload;
  }

  return normalizedReport
    ? [
        ...normalizedReport.blocks,
        ...(normalizedReport.html ? [normalizedReport.html] : []),
        ...(normalizedReport.jsonFallback ? [normalizedReport.jsonFallback] : []),
      ].filter((item) => item.trim().length > 0)
    : [];
};

export const getFormattedReportContent = (payload: unknown): string[] =>
  getReportContent(payload).map((item) => normalizeDisplayedReportContent(item));

const DEFAULT_REPORT_FEEDBACK_QUESTIONNAIRE: QuestionnaireSchema = {
  steps: [
    {
      id: "report-feedback",
      title: "Report Feedback",
      fields: [
        { kind: "rating", id: "report-feedback-clarity", label: "Clarity", max: 5 },
        { kind: "rating", id: "report-feedback-usefulness", label: "Usefulness", max: 5 },
        { kind: "rating", id: "report-feedback-trust", label: "Trust", max: 5 },
      ],
    },
  ],
};

const getMetadataFeedbackQuestionnaire = (
  report: Record<string, unknown>,
): QuestionnaireSchema | undefined =>
  report.feedbackEnabled === true ? DEFAULT_REPORT_FEEDBACK_QUESTIONNAIRE : undefined;

const getEmbeddedFeedbackQuestionnaire = (
  report: ReportConfig,
): QuestionnaireSchema | undefined => {
  const value = (report as Record<string, unknown>).feedbackQuestionnaire;
  return isRecord(value) && Array.isArray(value.steps) ? (value as QuestionnaireSchema) : undefined;
};

const getFallbackReportEntries = (predictionValue: unknown): PredictionReportDescriptor[] => {
  if (!isRecord(predictionValue)) {
    return [];
  }

  const reports = isRecord(predictionValue.reports) ? predictionValue.reports : null;
  const fallbackReportEntries = reports
    ? Object.entries(reports).filter(([, value]) => {
        if (!isRecord(value)) {
          return false;
        }
        const normalized = normalizeCustomReportResult(value);
        const hasLegacyReportBlocks =
          Array.isArray(value.explanations) &&
          value.explanations.some((item) => typeof item === "string" && item.trim().length > 0);
        return (
          hasLegacyReportBlocks ||
          normalized.blocks.length > 0 ||
          normalized.html !== null ||
          normalized.jsonFallback !== null
        );
      })
    : [];
  return fallbackReportEntries.flatMap(([reportId, value], index) => {
    const content = getReportContent(value);
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

  const reports = isRecord(predictionValue.reports) ? predictionValue.reports : {};
  const meta = isRecord(predictionValue.meta) ? predictionValue.meta : {};
  const explainErrors = isRecord(meta.explainErrors) ? meta.explainErrors : {};

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
    const content = getReportContent(reports[reportId]);
    const nextError = explainErrors[reportId];
    if (content.length === 0 && typeof nextError !== "string" && !feedbackQuestionnaire) {
      return [];
    }
    return [
      {
        order: index,
        reportId,
        label: typeof item.label === "string" ? item.label : reportId,
        content: content.map((value) => normalizeDisplayedReportContent(value)),
        error: typeof nextError === "string" ? nextError : null,
        feedbackQuestionnaire,
      },
    ];
  });
};

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
    const reports = isRecord(predictionValue.reports) ? predictionValue.reports : {};
    const meta = isRecord(predictionValue.meta) ? predictionValue.meta : {};
    const explainErrors = isRecord(meta.explainErrors) ? meta.explainErrors : {};

    return feedbackReports.flatMap((report: ReportConfig, index: number) => {
      const reportId = report.id ?? `report-${index + 1}`;
      const content = getReportContent(reports[reportId]);
      const nextError = explainErrors[reportId];
      const feedbackQuestionnaire =
        getEmbeddedFeedbackQuestionnaire(report) ??
        getMetadataFeedbackQuestionnaire(report as Record<string, unknown>);

      if (content.length === 0 && typeof nextError !== "string" && !feedbackQuestionnaire) {
        return [];
      }

      return [
        {
          order: index,
          reportId,
          label: report.label ?? reportId,
          content: content.map((item) => normalizeDisplayedReportContent(item)),
          error: typeof nextError === "string" ? nextError : null,
          feedbackQuestionnaire,
        },
      ];
    });
  } catch {
    const embeddedEntries = getEmbeddedSchemaReportEntries(predictionValue, schemaDefinition);
    return embeddedEntries.length > 0 ? embeddedEntries : getFallbackReportEntries(predictionValue);
  }
};
