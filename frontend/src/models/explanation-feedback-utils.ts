/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { normalizeCustomExplanationResult } from "../app/utils/mlform/custom-explanation";
import type { CatalogExplanationDefinition } from "../app/utils/mlform/custom-explanation";
import { toMlformSchema } from "../app/utils/mlform/schema-validation";
import type { ExplanationConfig } from "mlform/runtime";
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
    ? normalizeCustomExplanationResult(explanationPayload)
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

const getExplanationDefinitionMap = (
  customExplanationDefinitions: readonly CatalogExplanationDefinition[],
): Map<string, CatalogExplanationDefinition> =>
  new Map(customExplanationDefinitions.map((definition) => [definition.kind, definition]));

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
  explanation: ExplanationConfig,
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
        const normalized = normalizeCustomExplanationResult(value);
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

const getRawSchemaExplanationEntries = (
  predictionValue: unknown,
  signatureSchema: unknown,
  customExplanationDefinitions: readonly CatalogExplanationDefinition[],
): PredictionExplanationDescriptor[] => {
  if (
    !isRecord(predictionValue) ||
    !isRecord(signatureSchema) ||
    !Array.isArray(signatureSchema.explanations)
  ) {
    return getFallbackExplanationEntries(predictionValue);
  }

  const definitionMap = getExplanationDefinitionMap(customExplanationDefinitions);
  const reports = isRecord(predictionValue.reports) ? predictionValue.reports : {};
  const meta = isRecord(predictionValue.meta) ? predictionValue.meta : {};
  const explainErrors = isRecord(meta.explainErrors) ? meta.explainErrors : {};
  const entries = signatureSchema.explanations.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.kind !== "string") {
      return [];
    }

    const explanationId =
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id
        : `explanation-${index + 1}`;
    const content = getExplanationContent(reports[explanationId]);
    const nextError = explainErrors[explanationId];
    const feedbackQuestionnaire =
      getEmbeddedFeedbackQuestionnaire(item as ExplanationConfig) ??
      definitionMap.get(item.kind)?.definition.feedbackQuestionnaire ??
      getMetadataFeedbackQuestionnaire(item);

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
  return entries.length > 0 ? entries : getFallbackExplanationEntries(predictionValue);
};

export const extractPredictionExplanationEntries = (
  predictionValue: unknown,
  signatureSchema?: unknown,
  customExplanationDefinitions: readonly CatalogExplanationDefinition[] = [],
): PredictionExplanationDescriptor[] => {
  if (!isRecord(predictionValue)) {
    return [];
  }

  try {
    const schema = toMlformSchema(signatureSchema, {
      customExplanationDefinitions,
    });
    const definitionMap = getExplanationDefinitionMap(customExplanationDefinitions);
    const reports = isRecord(predictionValue.reports) ? predictionValue.reports : {};
    const meta = isRecord(predictionValue.meta) ? predictionValue.meta : {};
    const explainErrors = isRecord(meta.explainErrors) ? meta.explainErrors : {};

    return (schema.explanations ?? []).flatMap((explanation: ExplanationConfig, index: number) => {
      const explanationId = explanation.id ?? `explanation-${index + 1}`;
      const content = getExplanationContent(reports[explanationId]);
      const nextError = explainErrors[explanationId];
      const feedbackQuestionnaire =
        getEmbeddedFeedbackQuestionnaire(explanation) ??
        definitionMap.get(explanation.kind)?.definition.feedbackQuestionnaire ??
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
    return getRawSchemaExplanationEntries(
      predictionValue,
      signatureSchema,
      customExplanationDefinitions,
    );
  }
};
