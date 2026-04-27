/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OutputFeedbackDto, UpdateTargetRequest } from "./api/modelService";
import { toDisplayString } from "../app/utils/display";
import { buildTargetFeedbackValue } from "./target-utils";
import type { QuestionnaireSchema } from "mlform/questionnaire";
import { normalizeFeedbackValues } from "./questionnaire-feedback";

export const buildOutputFeedbackInitialValues = (
  outputFeedback: Pick<OutputFeedbackDto, "value"> | undefined,
  schema: QuestionnaireSchema,
): Record<string, unknown> => {
  return normalizeFeedbackValues(outputFeedback?.value, schema);
};

export const hasOutputFeedback = (outputFeedback?: Pick<OutputFeedbackDto, "value">): boolean =>
  Boolean(
    outputFeedback?.value &&
    Object.keys(outputFeedback.value as Record<string, unknown>).length > 0,
  );

export const buildTargetUpdateRequest = (
  targetId: string,
  order: number,
  values: Record<string, unknown>,
  assessmentFieldId: string,
  _realValueFieldId: string,
  signatureSchema: unknown,
): UpdateTargetRequest => {
  const raw = values[assessmentFieldId];

  if (raw === undefined || raw === null || raw === "") {
    throw new Error("Provide output feedback before saving.");
  }

  return {
    targetId,
    realValue: buildTargetFeedbackValue(toDisplayString(raw), signatureSchema, order),
  };
};
