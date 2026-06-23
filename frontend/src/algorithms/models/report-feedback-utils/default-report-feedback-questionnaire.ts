/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QuestionnaireSchema } from "../questionnaire-schema";

/**
 * DEFAULT_REPORT_FEEDBACK_QUESTIONNAIRE: provides legacy fallback report feedback fields.
 *
 * Purpose: keeps old report metadata that only says `feedbackEnabled: true` usable even when
 * the report does not embed a concrete questionnaire schema.
 * @returns Static questionnaire schema consumed by report-feedback extraction algorithms.
 * @throws Does not throw directly; callers handle malformed report metadata and schema context.
 * @remarks Side cases/effects: no runtime input, no mutation, and only applies when a caller
 * explicitly chooses this fallback for legacy report feedback configuration.
 */
export const DEFAULT_REPORT_FEEDBACK_QUESTIONNAIRE: QuestionnaireSchema = {
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
