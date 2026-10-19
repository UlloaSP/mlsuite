/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { CombinedFeedbackStep } from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import { createOutputFeedbackQuestionnaire } from "@/capabilities/prediction-runtime/feedback/output-feedback-questionnaire";
import { agreedFeedbackValues } from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { QuestionnaireSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { describeReportResult } from "@/capabilities/prediction-runtime/feedback/result-summary";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type {
  PredictionResultDto,
  PredictionResultFeedbackDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

type PredictionResultFeedbackType = PredictionResultFeedbackDto["type"];
type PredictionResult = Pick<PredictionResultDto, "id" | "modelId" | "output" | "status">;
type SchemaVersion = Pick<SchemaVersionDto, "formSchema" | "bindings">;

type FeedbackKind = "OUTPUT" | "EXPLANATION";

export type SchemaFeedbackStep = CombinedFeedbackStep<FeedbackKind, never> & {
  type: PredictionResultFeedbackType;
  targets: SchemaFeedbackTarget[];
};

export type SchemaFeedbackTarget = {
  resultId: number;
  modelId: number;
  feedback?: PredictionResultFeedbackDto;
};

const reportsOf = (schema: unknown): Record<string, unknown>[] =>
  isRecord(schema) && Array.isArray(schema.reports) ? schema.reports.filter(isRecord) : [];

const feedbackQuestionnaire = (report: Record<string, unknown>): QuestionnaireSchema | undefined =>
  isRecord(report.feedbackQuestionnaire)
    ? (report.feedbackQuestionnaire as QuestionnaireSchema)
    : undefined;

const fakeTarget = (order: number, value: unknown) =>
  ({
    id: String(order),
    order,
    value,
  }) as any;

const feedbackKey = (resultId: number, type: PredictionResultFeedbackType, order: number): string =>
  `${resultId}:${type}:${order}`;

type DisplayTarget = {
  result: PredictionResult;
  display: ReturnType<typeof getSchemaResultReports>[number];
};

const stepTargets = (
  members: readonly DisplayTarget[],
  type: PredictionResultFeedbackType,
  order: number,
  feedbackByKey: ReadonlyMap<string, PredictionResultFeedbackDto>,
): SchemaFeedbackTarget[] =>
  members.map(({ result }) => ({
    resultId: result.id,
    modelId: result.modelId,
    feedback: feedbackByKey.get(feedbackKey(result.id, type, order)),
  }));

/** Several models answering one report are told apart by name. */
const combinedDescription = (version: SchemaVersion, members: readonly DisplayTarget[]): string =>
  members
    .map(({ result, display }) => {
      const answer = describeReportResult(display.kind, display.payload);
      if (members.length === 1) return answer;
      const model = version.bindings.find((binding) => binding.modelId === result.modelId);
      return `${model?.modelName ?? `Model ${result.modelId}`}: ${answer}`;
    })
    .join("\n");

export const buildSchemaFeedbackSteps = (
  version: SchemaVersion,
  results: readonly PredictionResult[],
  feedback: readonly PredictionResultFeedbackDto[],
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
          description: combinedDescription(version, members),
          schema: questionnaire,
          initialValues: agreedFeedbackValues(explanationTargets, questionnaire) ?? {},
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
      description: combinedDescription(version, members),
      schema: outputSchema,
      initialValues: agreedFeedbackValues(outputTargets, outputSchema) ?? {},
    };
    return explanationStep ? [outputStep, explanationStep] : [outputStep];
  });
};
