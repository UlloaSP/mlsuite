/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CombinedFeedbackStep } from "@/capabilities/mlform/combined-feedback-questionnaire";
import { createOutputFeedbackQuestionnaire } from "@/capabilities/mlform/output-feedback-questionnaire";
import {
  getEffectiveFeedbackValues,
  getQuestionnaireFieldIds,
} from "@/capabilities/mlform/questionnaire-feedback";
import type { QuestionnaireSchema } from "@/capabilities/mlform/questionnaire-schema";
import { isBuiltinReportKind } from "@/capabilities/mlform/builtin-registry";
import { getFormattedReportContent } from "@/capabilities/mlform/report-feedback-utils";
import { getSchemaResultReports } from "@/capabilities/mlform/report-display";

type JsonRecord = Record<string, unknown>;
type PredictionResultFeedbackType = "OUTPUT" | "EXPLANATION";
type PredictionResultFeedback = {
  id: string;
  resultId: string;
  type: PredictionResultFeedbackType;
  order: number;
  value: unknown;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  createdAt?: string;
};
type PredictionResult = {
  [key: string]: unknown;
  id: string;
  modelId: string;
  output: JsonRecord;
  status: "SUCCESS" | "FAILED";
};
type SchemaVersion = {
  [key: string]: unknown;
  id: string;
  schemaId?: string;
  version?: number;
  formSchema: JsonRecord;
  bindings: Array<{ modelId: string; pluginPolicy?: JsonRecord | null }>;
};

type FeedbackKind = "OUTPUT" | "EXPLANATION";

/**
 * SchemaFeedbackStep: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: builds ordered feedback steps for schema run model reports and plugin reports.
 * @param order - Input consumed by SchemaFeedbackStep; uses the ordered feedback steps for schema run reports contract.
 * @param value - Input consumed by SchemaFeedbackStep; uses the ordered feedback steps for schema run reports contract.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type SchemaFeedbackStep = CombinedFeedbackStep<FeedbackKind, never> & {
  type: PredictionResultFeedbackType;
  targets: SchemaFeedbackTarget[];
};

export type SchemaFeedbackTarget = {
  resultId: string;
  modelId: string;
  feedback?: PredictionResultFeedback;
};

/** isRecord: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** reportsOf: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportsOf = (schema: unknown): Record<string, unknown>[] =>
  isRecord(schema) && Array.isArray(schema.reports) ? schema.reports.filter(isRecord) : [];

/** feedbackQuestionnaire: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const feedbackQuestionnaire = (report: Record<string, unknown>): QuestionnaireSchema | undefined =>
  isRecord(report.feedbackQuestionnaire)
    ? (report.feedbackQuestionnaire as QuestionnaireSchema)
    : undefined;

/** fakeTarget: internal helper for schema composition, run, report, and feedback flow. @remarks Args: order, value; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const fakeTarget = (order: number, value: unknown) =>
  ({
    id: String(order),
    order,
    value,
  }) as any;

/** displayRecord: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const displayRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

/** formatProbability: internal normalization helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const formatProbability = (value: unknown): string | null =>
  typeof value === "number" ? `${(value * 100).toFixed(2)}%` : null;

/** outputDescription: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const outputDescription = (payload: unknown): string => {
  const record = displayRecord(payload);
  const probabilities = Array.isArray(record.probabilities) ? record.probabilities : [];
  const labels = Array.isArray(record.labels) ? record.labels : [];
  const inferredIndex = probabilities.indexOf(Math.max(...probabilities));
  const prediction = record.prediction ?? record.value ?? labels[inferredIndex] ?? payload;
  const index = labels.findIndex((label) => String(label) === String(prediction));
  const probability = formatProbability(index >= 0 ? probabilities[index] : undefined);
  return probability
    ? `Prediction result: ${String(prediction)} · ${probability}`
    : `Prediction result: ${String(prediction)}`;
};

/** reportDescription: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportDescription = (payload: unknown): string => {
  const content = getFormattedReportContent(payload).join("\n\n");
  return content ? `Prediction report:\n${content}` : "Prediction report";
};

const feedbackKey = (resultId: string, type: PredictionResultFeedbackType, order: number): string =>
  `${resultId}:${type}:${order}`;

type DisplayTarget = {
  result: PredictionResult;
  display: ReturnType<typeof getSchemaResultReports>[number];
};

const commonFeedbackValues = (
  targets: readonly SchemaFeedbackTarget[],
  schema: QuestionnaireSchema,
): Record<string, unknown> => {
  if (targets.length === 0 || targets.some((target) => !target.feedback)) return {};
  const values = targets.map((target) => getEffectiveFeedbackValues(target.feedback, schema));
  const fieldIds = getQuestionnaireFieldIds(schema);
  const first = values[0] ?? {};
  const equal = values.every((value) =>
    fieldIds.every((fieldId) => JSON.stringify(value[fieldId]) === JSON.stringify(first[fieldId])),
  );
  return equal ? first : {};
};

const stepTargets = (
  members: readonly DisplayTarget[],
  type: PredictionResultFeedbackType,
  order: number,
  feedbackByKey: ReadonlyMap<string, PredictionResultFeedback>,
): SchemaFeedbackTarget[] =>
  members.map(({ result }) => ({
    resultId: result.id,
    modelId: result.modelId,
    feedback: feedbackByKey.get(feedbackKey(result.id, type, order)),
  }));

const combinedDescription = (
  members: readonly DisplayTarget[],
  describe: (payload: unknown) => string,
): string =>
  members.length === 1
    ? describe(members[0]?.display.payload)
    : members
        .map(({ result, display }) => `${result.modelId}: ${describe(display.payload)}`)
        .join("\n");

/**
 * buildSchemaFeedbackSteps: constructs a new derived object from source data
 *
 * Purpose: builds ordered feedback steps for schema run model reports and plugin reports.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const buildSchemaFeedbackSteps = (
  version: SchemaVersion,
  results: readonly PredictionResult[],
  feedback: readonly PredictionResultFeedback[],
): SchemaFeedbackStep[] => {
  const feedbackByKey = new Map(
    feedback.map((item) => [feedbackKey(item.resultId, item.type, item.order), item]),
  );
  const sourceReports = reportsOf(version.formSchema);

  return sourceReports.flatMap((config, order): SchemaFeedbackStep[] => {
    const members = results.flatMap((result): DisplayTarget[] => {
      if (result.status !== "SUCCESS") return [];
      const display = getSchemaResultReports(version, result).find(
        (candidate) => candidate.order === order,
      );
      return display ? [{ result, display }] : [];
    });
    const first = members[0];
    if (!first) return [];
    const questionnaire = feedbackQuestionnaire(config);
    const explanationTargets = stepTargets(members, "EXPLANATION", order, feedbackByKey);
    const explanationStep: SchemaFeedbackStep | null = questionnaire
      ? {
          id: `report-${order}-explanation`,
          kind: "EXPLANATION",
          type: "EXPLANATION",
          targets: explanationTargets,
          order,
          title: `${first.display.label} review`,
          description: combinedDescription(members, reportDescription),
          schema: questionnaire,
          initialValues: commonFeedbackValues(explanationTargets, questionnaire),
        }
      : null;
    if (!isBuiltinReportKind(first.display.kind)) {
      return explanationStep ? [explanationStep] : [];
    }
    const outputSchema = createOutputFeedbackQuestionnaire(
      config,
      fakeTarget(order, first.display.payload),
      first.result.output,
    );
    const outputTargets = stepTargets(members, "OUTPUT", order, feedbackByKey);
    const outputStep: SchemaFeedbackStep = {
      id: `report-${order}-output`,
      kind: "OUTPUT",
      type: "OUTPUT",
      targets: outputTargets,
      order,
      title: first.display.label,
      description: combinedDescription(members, outputDescription),
      schema: outputSchema,
      initialValues: commonFeedbackValues(outputTargets, outputSchema),
    };
    return explanationStep ? [outputStep, explanationStep] : [outputStep];
  });
};
