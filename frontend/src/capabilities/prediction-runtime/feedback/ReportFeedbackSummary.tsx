/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import {
  formatFeedbackValue,
  getQuestionnaireFieldDescriptors,
  type QuestionnaireFieldDescriptor,
} from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import type { QuestionnaireSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";

type ReportFeedbackSummaryProps = {
  schema?: QuestionnaireSchema;
  title?: string;
  values?: Record<string, unknown>;
};

const EMPTY_VALUES: Record<string, unknown> = {};

export function ReportFeedbackSummary({
  schema,
  title = "Saved feedback",
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
              className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3"
            >
              <span className="text-sm font-medium text-fg-secondary">{field.label}</span>
              <span className="font-mono text-sm text-fg">
                {formatFeedbackValue(values[field.id], field)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <AppEmptyState compact title="No feedback yet" description="Saved answers appear here." />
      )}
    </AppPanel>
  );
}
