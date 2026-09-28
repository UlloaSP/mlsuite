/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import { AppCopy } from "@/shared/ui/AppCopy";
import { ReportFeedbackSummary } from "@/capabilities/prediction-runtime/feedback/ReportFeedbackSummary";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

type Props = {
  run: PredictionRunDto;
  version: SchemaVersionDto;
  feedback: PredictionResultFeedbackDto[];
};

/** The answers an inference has received, per questionnaire step. Answering happens in reviews. */
export function SchemaRunFeedbackSummary({ run, version, feedback }: Props) {
  const steps = useMemo(
    () => buildSchemaFeedbackSteps(version, run.results, feedback),
    [feedback, run.results, version],
  );

  if (steps.length === 0) {
    return <AppCopy>No feedback questionnaire configured for this inference.</AppCopy>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {steps.map((step) => (
        <ReportFeedbackSummary
          key={step.id}
          schema={step.schema}
          title={step.title}
          values={step.initialValues}
        />
      ))}
    </div>
  );
}
