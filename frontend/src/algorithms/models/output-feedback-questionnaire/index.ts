/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QuestionnaireSchema } from "../questionnaire-schema";

type OutputTarget = {
  value: unknown;
};

const OUTPUT_STEP_ID = "output-feedback";
const ASSESSMENT_FIELD_ID = `${OUTPUT_STEP_ID}-assessment`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getClassifierOptions = (
  reportConfig: Record<string, unknown> | undefined,
  target: OutputTarget,
  predictionValue: unknown,
) => {
  const labels = Array.isArray(reportConfig?.labels)
    ? reportConfig.labels.filter((item): item is string => typeof item === "string")
    : [];
  const outputs =
    isRecord(predictionValue) && Array.isArray(predictionValue.outputs)
      ? predictionValue.outputs.filter(isRecord)
      : [];
  const classifierOutput = outputs.find((output) => output.type === "classifier");
  const mapping = Array.isArray(classifierOutput?.mapping) ? classifierOutput.mapping : [];
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

export const getOutputFeedbackFieldIds = (kind: string | null) => ({
  assessment: ASSESSMENT_FIELD_ID,
  realValue:
    kind === "classifier" ? `${OUTPUT_STEP_ID}-correct-class` : `${OUTPUT_STEP_ID}-corrected-value`,
});

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
