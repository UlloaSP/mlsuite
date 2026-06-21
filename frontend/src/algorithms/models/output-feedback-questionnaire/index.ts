/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QuestionnaireSchema } from "../questionnaire-schema";

type OutputTarget = {
  value: unknown;
};

/** OUTPUT_STEP_ID: internal constant/cache for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const OUTPUT_STEP_ID = "output-feedback";
/** ASSESSMENT_FIELD_ID: internal constant/cache for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const ASSESSMENT_FIELD_ID = `${OUTPUT_STEP_ID}-assessment`;

/** isRecord: internal predicate for model prediction, feedback, upload, and export data shaping. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** getClassifierOptions: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: reportConfig, unknown, target, predictionValue; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getClassifierOptions = (
  reportConfig: Record<string, unknown> | undefined,
  target: OutputTarget,
  predictionValue: unknown,
) => {
  const labels = Array.isArray(reportConfig?.labels)
    ? reportConfig.labels.filter((item): item is string => typeof item === "string")
    : [];
  const reports =
    isRecord(predictionValue) && Array.isArray(predictionValue.reports)
      ? predictionValue.reports.filter(isRecord)
      : [];
  const classifierReport = reports.find((output) => output.kind === "classifier");
  const mapping = Array.isArray(classifierReport?.mapping) ? classifierReport.mapping : [];
  const fallbackIndex =
    isRecord(target.value) && typeof target.value.classIndex === "number"
      ? target.value.classIndex + 1
      : 0;
  const size = Math.max(labels.length, mapping.length, fallbackIndex, 1);

  return Array.from({ length: size }, (_, index) => ({
    label: labels[index] ?? String(mapping[index] ?? index),
    value: String(mapping[index] ?? labels[index] ?? index),
  }));
};

/**
 * getOutputFeedbackFieldIds: extracts a derived value without mutating input
 *
 * Purpose: builds output-level feedback questionnaire schema.
 * @param kind - Input consumed by getOutputFeedbackFieldIds; uses the builds output-level feedback questionnaire schema contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getOutputFeedbackFieldIds = (kind: string | null) => ({
  assessment: ASSESSMENT_FIELD_ID,
  realValue:
    kind === "classifier" ? `${OUTPUT_STEP_ID}-correct-class` : `${OUTPUT_STEP_ID}-corrected-value`,
});

/**
 * createOutputFeedbackQuestionnaire: creates a configured runtime object or schema object
 *
 * Purpose: builds output-level feedback questionnaire schema.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const createOutputFeedbackQuestionnaire = (
  reportConfig: Record<string, unknown> | undefined,
  target: OutputTarget,
  predictionValue: unknown,
): QuestionnaireSchema => {
  const kind = typeof reportConfig?.kind === "string" ? reportConfig.kind : null;

  if (kind === "classifier") {
    return {
      steps: [
        {
          id: OUTPUT_STEP_ID,
          title: "Output feedback",
          fields: [
            {
              kind: "category" as const,
              id: ASSESSMENT_FIELD_ID,
              label: "Assessment",
              required: true,
              options: getClassifierOptions(reportConfig, target, predictionValue),
            },
          ],
        },
      ],
    };
  }

  return {
    steps: [
      {
        id: OUTPUT_STEP_ID,
        title: "Output feedback",
        fields: [
          {
            kind: "number" as const,
            id: ASSESSMENT_FIELD_ID,
            label: "Assessment",
            required: true,
          },
        ],
      },
    ],
  };
};
