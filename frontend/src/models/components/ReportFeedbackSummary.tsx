/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components/ui";
import {
  formatFeedbackValue,
  getQuestionnaireFieldDescriptors,
  type QuestionnaireFieldDescriptor,
} from "../questionnaire-feedback";
import type { QuestionnaireSchema } from "../questionnaire-schema";

type ReportFeedbackSummaryProps = {
  schema?: QuestionnaireSchema;
  title?: string;
  values?: Record<string, unknown>;
};

const EMPTY_VALUES: Record<string, unknown> = {};

export function ReportFeedbackSummary({
  schema,
  title = "Saved Feedback",
  values = EMPTY_VALUES,
}: ReportFeedbackSummaryProps) {
  if (!schema) {
    return <AppCopy>No feedback questionnaire configured for this report.</AppCopy>;
  }

  const fields = getQuestionnaireFieldDescriptors(schema).filter(
    (field: QuestionnaireFieldDescriptor) => values[field.id] !== undefined,
  );

  return (
    <AppPanel className="space-y-4">
      <AppSectionTitle>{title}</AppSectionTitle>
      {fields.length > 0 ? (
        <div className="space-y-3">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between rounded-[18px] bg-[var(--surface-muted)] px-4 py-3"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {field.label}
              </span>
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {formatFeedbackValue(values[field.id], field)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <AppCopy>No feedback saved yet.</AppCopy>
      )}
    </AppPanel>
  );
}
