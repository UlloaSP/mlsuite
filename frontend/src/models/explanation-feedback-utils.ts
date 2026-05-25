/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeCustomReportResult } from "../app/utils/mlform/custom-report-result";
import { toMlformSchema } from "../app/utils/mlform/schema-validation";
import type { ReportConfig } from "mlform/runtime";
import type { PredictionExplanationDescriptor } from "./questionnaire-feedback";
import type { QuestionnaireSchema } from "./questionnaire-schema";

type JsonRecord = Record<string, unknown>;

type ExplanationPayload = {
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

const formatExplanationTree = (value: string): string => {
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

const normalizeDisplayedExplanation = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("|__") || trimmed.includes("||") || trimmed.startsWith("*")) {
    return formatExplanationTree(trimmed);
  }

  return trimmed;
};

const getExplanationContent = (payload: unknown): string[] => {
  const explanationPayload = isRecord(payload) ? (payload as ExplanationPayload) : null;
  const explanationsFromLegacyPayload =
    explanationPayload && Array.isArray(explanationPayload.explanations)
      ? explanationPayload.explanations.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];
  const normalizedExplanation = explanationPayload
    ? normalizeCustomReportResult(explanationPayload)
    : null;

  return explanationsFromLegacyPayload.length > 0
    ? explanationsFromLegacyPayload
    : normalizedExplanation
      ? [
          ...normalizedExplanation.blocks,
          ...(normalizedExplanation.html ? [normalizedExplanation.html] : []),
          ...(normalizedExplanation.jsonFallback ? [normalizedExplanation.jsonFallback] : []),
        ].filter((item) => item.trim().length > 0)
      : [];
};

const DEFAULT_EXPLANATION_FEEDBACK_QUESTIONNAIRE: QuestionnaireSchema = {
  steps: [
    {
      id: "explanation-feedback",
      title: "Explanation Feedback",
      fields: [
        { kind: "rating", id: "explanation-feedback-clarity", label: "Clarity", max: 5 },
        { kind: "rating", id: "explanation-feedback-usefulness", label: "Usefulness", max: 5 },
        { kind: "rating", id: "explanation-feedback-trust", label: "Trust", max: 5 },
      ],
    },
  ],
};

const getMetadataFeedbackQuestionnaire = (
  explanation: Record<string, unknown>,
): QuestionnaireSchema | undefined =>
  explanation.feedbackEnabled === true ? DEFAULT_EXPLANATION_FEEDBACK_QUESTIONNAIRE : undefined;

const getEmbeddedFeedbackQuestionnaire = (
  explanation: ReportConfig,
): QuestionnaireSchema | undefined => {
  const value = (explanation as Record<string, unknown>).feedbackQuestionnaire;
  return isRecord(value) && Array.isArray(value.steps) ? (value as QuestionnaireSchema) : undefined;
};

const getFallbackExplanationEntries = (
  predictionValue: unknown,
): PredictionExplanationDescriptor[] => {
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
        const hasLegacyExplanations =
          Array.isArray(value.explanations) &&
          value.explanations.some((item) => typeof item === "string" && item.trim().length > 0);
        return (
          hasLegacyExplanations ||
          normalized.blocks.length > 0 ||
          normalized.html !== null ||
          normalized.jsonFallback !== null
        );
      })
    : [];
  return fallbackReportEntries.flatMap(([reportId, value], index) => {
    const content = getExplanationContent(value);
    if (content.length === 0) {
      return [];
    }

    return [
      {
        order: index,
        explanationId: reportId,
        label: reportId,
        content: content.map((item) => normalizeDisplayedExplanation(item)),
        error: null,
      },
    ];
  });
};

const getEmbeddedSchemaExplanationEntries = (
  predictionValue: unknown,
  signatureSchema: unknown,
): PredictionExplanationDescriptor[] => {
  if (!isRecord(predictionValue) || !isRecord(signatureSchema) || !Array.isArray(signatureSchema.reports)) {
    return [];
  }

  const reports = isRecord(predictionValue.reports) ? predictionValue.reports : {};
  const meta = isRecord(predictionValue.meta) ? predictionValue.meta : {};
  const explainErrors = isRecord(meta.explainErrors) ? meta.explainErrors : {};

  return signatureSchema.reports.flatMap((item, index) => {
    if (!isRecord(item)) {
      return [];
    }
    const feedbackQuestionnaire =
      getEmbeddedFeedbackQuestionnaire(item as ReportConfig) ?? getMetadataFeedbackQuestionnaire(item);
    if (!feedbackQuestionnaire && item.feedbackEnabled !== false) {
      return [];
    }

    const explanationId =
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id
        : `explanation-${index + 1}`;
    const content = getExplanationContent(reports[explanationId]);
    const nextError = explainErrors[explanationId];
    if (content.length === 0 && typeof nextError !== "string" && !feedbackQuestionnaire) {
      return [];
    }
    return [
      {
        order: index,
        explanationId,
        label: typeof item.label === "string" ? item.label : explanationId,
        content: content.map((value) => normalizeDisplayedExplanation(value)),
        error: typeof nextError === "string" ? nextError : null,
        feedbackQuestionnaire,
      },
    ];
  });
};

export const extractPredictionExplanationEntries = (
  predictionValue: unknown,
  signatureSchema?: unknown,
): PredictionExplanationDescriptor[] => {
  if (!isRecord(predictionValue)) {
    return [];
  }

  try {
    const schema = toMlformSchema(signatureSchema);
    const explanationReports = (schema.reports ?? []).filter(
      (report: ReportConfig) =>
        getEmbeddedFeedbackQuestionnaire(report) !== undefined ||
        (report as Record<string, unknown>).feedbackEnabled === true,
    );
    if (explanationReports.length === 0) {
      return getFallbackExplanationEntries(predictionValue);
    }
    const reports = isRecord(predictionValue.reports) ? predictionValue.reports : {};
    const meta = isRecord(predictionValue.meta) ? predictionValue.meta : {};
    const explainErrors = isRecord(meta.explainErrors) ? meta.explainErrors : {};

    return explanationReports.flatMap((explanation: ReportConfig, index: number) => {
      const explanationId = explanation.id ?? `explanation-${index + 1}`;
      const content = getExplanationContent(reports[explanationId]);
      const nextError = explainErrors[explanationId];
      const feedbackQuestionnaire =
        getEmbeddedFeedbackQuestionnaire(explanation) ??
        getMetadataFeedbackQuestionnaire(explanation as Record<string, unknown>);

      if (content.length === 0 && typeof nextError !== "string" && !feedbackQuestionnaire) {
        return [];
      }

      return [
        {
          order: index,
          explanationId,
          label: explanation.label ?? explanationId,
          content: content.map((item) => normalizeDisplayedExplanation(item)),
          error: typeof nextError === "string" ? nextError : null,
          feedbackQuestionnaire,
        },
      ];
    });
  } catch {
    const embeddedEntries = getEmbeddedSchemaExplanationEntries(predictionValue, signatureSchema);
    return embeddedEntries.length > 0 ? embeddedEntries : getFallbackExplanationEntries(predictionValue);
  }
};
