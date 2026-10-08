/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  type CombinedFeedbackStep,
  valuesForCombinedStep,
} from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import { createOutputFeedbackQuestionnaire } from "@/capabilities/prediction-runtime/feedback/output-feedback-questionnaire";
import { normalizeFeedbackValues } from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { QuestionnaireSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import { getFormattedReportContent } from "@/capabilities/prediction-runtime/feedback/report-feedback-utils";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import {
  publicRunDisplayReports,
  type PublicRunDisplayReport,
} from "@/features/explore/lib/public-run-display";
import type {
  PublicBookmarkDto,
  PublicRunDto,
  PublicRunFeedbackDto,
  PublicRunFeedbackRequest,
} from "@/shared/api/openapi.gen";

type FeedbackType = PublicRunFeedbackDto["type"];

/** One question set a visitor answers about one report of their run, with what they answered. */
export type PublicFeedbackStep = CombinedFeedbackStep<FeedbackType, never> & {
  reportKey: string;
  type: FeedbackType;
  /** The answers kept on the server, by field, or undefined before the first review. */
  saved?: Record<string, unknown>;
};

const formatProbability = (value: unknown): string | null =>
  typeof value === "number" ? `${(value * 100).toFixed(2)}%` : null;

/** What the run predicted, as the workspace's review describes it to a reviewer. */
const outputDescription = (payload: unknown): string => {
  const record = isRecord(payload) ? payload : {};
  const probabilities = Array.isArray(record.probabilities) ? record.probabilities : [];
  const labels = Array.isArray(record.labels) ? record.labels : [];
  const prediction =
    record.prediction ?? record.value ?? labels[probabilities.indexOf(Math.max(...probabilities))];
  const index = labels.findIndex((label) => String(label) === String(prediction));
  const probability = formatProbability(index >= 0 ? probabilities[index] : undefined);
  return probability
    ? `Prediction result: ${String(prediction)} · ${probability}`
    : `Prediction result: ${String(prediction)}`;
};

const reportDescription = (payload: unknown): string => {
  const content = getFormattedReportContent(payload).join("\n\n");
  return content ? `Prediction report:\n${content}` : "Prediction report";
};

const savedAnswers = (
  run: Pick<PublicRunDto, "feedback">,
  reportKey: string,
  type: FeedbackType,
  schema: QuestionnaireSchema,
): Record<string, unknown> | undefined => {
  const item = run.feedback.find(
    (feedback) => feedback.reportKey === reportKey && feedback.type === type,
  );
  return item ? normalizeFeedbackValues(item.value, schema) : undefined;
};

const stepsOf = (
  { key, report, payload }: PublicRunDisplayReport,
  run: Pick<PublicRunDto, "feedback">,
): PublicFeedbackStep[] => {
  const steps: PublicFeedbackStep[] = [];
  if (isBuiltinReportKind(report.kind)) {
    const schema = createOutputFeedbackQuestionnaire(
      report.config,
      { value: report.payload },
      { reports: [payload] },
    );
    const saved = savedAnswers(run, key, "OUTPUT", schema);
    steps.push({
      id: `${key}-output`,
      kind: "OUTPUT",
      type: "OUTPUT",
      reportKey: key,
      order: report.order,
      title: report.label,
      description: outputDescription(report.payload),
      schema,
      initialValues: saved ?? {},
      saved,
    });
  }
  const questionnaire = report.config.feedbackQuestionnaire;
  if (
    isRecord(questionnaire) &&
    Array.isArray(questionnaire.steps) &&
    questionnaire.steps.length > 0
  ) {
    const schema = questionnaire as QuestionnaireSchema;
    const saved = savedAnswers(run, key, "EXPLANATION", schema);
    steps.push({
      id: `${key}-explanation`,
      kind: "EXPLANATION",
      type: "EXPLANATION",
      reportKey: key,
      order: report.order,
      title: `${report.label} review`,
      description: reportDescription(report.payload),
      schema,
      initialValues: saved ?? {},
      saved,
    });
  }
  return steps;
};

/**
 * The review a visitor can give of their run: for each report it answered, an assessment of
 * the output when the kit renders that kind itself, and the publisher's questionnaire when the
 * report has one. Each step is a question set on its own; the page asks them as one form.
 */
export const buildPublicFeedbackSteps = (
  formSchema: PublicBookmarkDto["formSchema"],
  run: Pick<PublicRunDto, "reports" | "feedback">,
): PublicFeedbackStep[] =>
  publicRunDisplayReports(formSchema, run).flatMap((display) => stepsOf(display, run));

/** A run is reviewed once every step of its review has answers kept on the server. */
export const isPublicRunReviewed = (steps: readonly PublicFeedbackStep[]): boolean =>
  steps.length > 0 && steps.every((step) => step.saved !== undefined);

/** The combined form's values split into one answer per step, as the server takes them. */
export const publicFeedbackItems = (
  steps: readonly PublicFeedbackStep[],
  values: Record<string, unknown>,
): PublicRunFeedbackRequest["items"] =>
  steps.map((step) => ({
    reportKey: step.reportKey,
    type: step.type,
    value: valuesForCombinedStep(values, step),
  }));
