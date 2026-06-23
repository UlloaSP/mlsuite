/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { valuesForCombinedStep } from "../../../algorithms/models/combined-feedback-questionnaire";
import {
  getEffectiveFeedbackValues,
  getQuestionnaireFieldIds,
} from "../../models/questionnaire-feedback";
import type { SchemaFeedbackStep } from "../feedback-steps";

/** isFilledFeedbackValue: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isFilledFeedbackValue = (value: unknown): boolean =>
  value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);

/** hasCompleteSavedSchemaFeedback: internal predicate for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const hasCompleteSavedSchemaFeedback = (step: SchemaFeedbackStep): boolean => {
  const fieldIds = getQuestionnaireFieldIds(step.schema);
  const values = getEffectiveFeedbackValues(step.feedback, step.schema);
  return fieldIds.length > 0 && fieldIds.every((fieldId) => isFilledFeedbackValue(values[fieldId]));
};

/**
 * isSchemaFeedbackComplete: returns a boolean guard/result for the requested predicate
 *
 * Purpose: checks whether schema run feedback steps are complete.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const isSchemaFeedbackComplete = (steps: readonly SchemaFeedbackStep[]): boolean =>
  steps.length > 0 && steps.every(hasCompleteSavedSchemaFeedback);

/**
 * isCombinedSchemaFeedbackComplete: returns a boolean guard/result for the requested predicate
 *
 * Purpose: checks whether schema run feedback steps are complete.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const isCombinedSchemaFeedbackComplete = (
  steps: readonly SchemaFeedbackStep[],
  values: Record<string, unknown>,
): boolean =>
  steps.length > 0 &&
  steps.every((step) => {
    const fieldIds = getQuestionnaireFieldIds(step.schema);
    const stepValues = valuesForCombinedStep(values, step);
    return (
      fieldIds.length > 0 && fieldIds.every((fieldId) => isFilledFeedbackValue(stepValues[fieldId]))
    );
  });
