/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Edit3 } from "lucide-react";
import { useAtom } from "jotai";
import { useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppButton } from "@/shared/ui/AppButton";
import {
  buildCombinedFeedbackQuestionnaire,
  createCombinedQuestionnaireTransport,
  valuesForCombinedStep,
} from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import { saveSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-save";
import { ReportFeedbackSummary } from "@/capabilities/prediction-runtime/feedback/ReportFeedbackSummary";
import { ReportQuestionnaireMount } from "@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount";
import {
  useCreatePredictionResultFeedbackMutation,
  useUpdatePredictionResultFeedbackMutation,
} from "@/features/schemas/api/schema-prediction-mutations";
import {
  isCombinedSchemaFeedbackComplete,
  isSchemaFeedbackComplete,
} from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
} from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";

type Props = {
  canEdit: boolean;
  run: PredictionRunDto;
  version: SchemaVersionDto;
  feedback: PredictionResultFeedbackDto[];
  onSaved: () => Promise<unknown> | unknown;
};

export function SchemaRunFeedbackQuestionnaire({
  canEdit,
  run,
  version,
  feedback,
  onSaved,
}: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [editing, setEditing] = useReducer((_: boolean, next: boolean) => next, false);
  const [submitting, setSubmitting] = useState(false);
  const [savedValues, setSavedValues] = useState<Record<string, unknown> | null>(null);
  const createFeedback = useCreatePredictionResultFeedbackMutation();
  const updateFeedback = useUpdatePredictionResultFeedbackMutation();
  const steps = useMemo(
    () => buildSchemaFeedbackSteps(version, run.results, feedback),
    [feedback, run.results, version],
  );
  const combined = useMemo(
    () => buildCombinedFeedbackQuestionnaire(steps, { required: true }),
    [steps],
  );
  const complete = isSchemaFeedbackComplete(steps);
  const savedValuesComplete =
    savedValues !== null && isCombinedSchemaFeedbackComplete(steps, savedValues);
  const displayComplete = complete || savedValuesComplete;
  const labels = useMemo(() => ({ submit: "Save feedback", submitting: "Saving feedback..." }), []);
  const transport = useMemo(
    () =>
      createCombinedQuestionnaireTransport(async (values) => {
        await saveSchemaFeedbackSteps(steps, values, {
          create: (step, target, value) =>
            createFeedback.mutateAsync({
              resultId: target.resultId,
              type: step.type,
              order: step.order,
              value,
            }),
          update: (_step, _target, feedback, value) =>
            updateFeedback.mutateAsync({
              feedbackId: feedback.id,
              value,
            }),
        });
      }),
    [createFeedback, steps, updateFeedback],
  );

  if (steps.length === 0) {
    return <AppCopy>No feedback questionnaire configured for this inference.</AppCopy>;
  }

  if (!canEdit || (displayComplete && !editing && !submitting)) {
    return (
      <div className="space-y-4">
        {canEdit ? (
          <div className="flex justify-end">
            <AppButton type="button" variant="ghost" onClick={() => setEditing(true)}>
              <Edit3 size={15} />
              Edit
            </AppButton>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <ReportFeedbackSummary
              key={step.id}
              schema={step.schema}
              title={step.title}
              values={savedValues ? valuesForCombinedStep(savedValues, step) : step.initialValues}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ReportQuestionnaireMount
      schema={combined.schema}
      initialValues={savedValues ?? combined.initialValues}
      editable
      theme={theme}
      mode="standalone"
      transport={transport}
      onSubmittingChange={setSubmitting}
      onSubmitted={async (values) => {
        setSavedValues(values);
        await onSaved();
        setEditing(false);
        toast.success("Feedback saved");
      }}
      labels={labels}
    />
  );
}
