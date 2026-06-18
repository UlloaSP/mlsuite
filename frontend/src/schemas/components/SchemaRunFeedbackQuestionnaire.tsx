/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Edit3 } from "lucide-react";
import { useAtom } from "jotai";
import { useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppCopy, AppPanel, AppButton } from "../../app/components";
import {
  buildCombinedFeedbackQuestionnaire,
  createCombinedQuestionnaireTransport,
  valuesForCombinedStep,
} from "../../algorithms/models/combined-feedback-questionnaire";
import { ReportFeedbackSummary } from "../../models/components/ReportFeedbackSummary";
import { ReportQuestionnaireMount } from "../../models/components/ReportQuestionnaireMount";
import {
  useCreatePredictionResultFeedbackMutation,
  useUpdatePredictionResultFeedbackMutation,
} from "../hooks";
import {
  isCombinedSchemaFeedbackComplete,
  isSchemaFeedbackComplete,
} from "../../algorithms/schema/feedback-state";
import { buildSchemaFeedbackSteps } from "../../algorithms/schema/feedback-steps";
import type { PredictionResultFeedbackDto, PredictionRunDto, SchemaVersionDto } from "../types";

type Props = {
  run: PredictionRunDto;
  version: SchemaVersionDto;
  feedback: PredictionResultFeedbackDto[];
  onSaved: () => Promise<unknown> | unknown;
};

export function SchemaRunFeedbackQuestionnaire({ run, version, feedback, onSaved }: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [editing, setEditing] = useReducer((_: boolean, next: boolean) => next, false);
  const [savedValues, setSavedValues] = useState<Record<string, unknown> | null>(null);
  const createFeedback = useCreatePredictionResultFeedbackMutation("");
  const updateFeedback = useUpdatePredictionResultFeedbackMutation("");
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
        await Promise.all(
          steps.map(async (step) => {
            const stepValues = valuesForCombinedStep(values, step);
            if (step.feedback) {
              await updateFeedback.mutateAsync({
                feedbackId: step.feedback.id,
                value: stepValues,
              });
            } else {
              await createFeedback.mutateAsync({
                resultId: step.resultId,
                type: step.type,
                order: step.order,
                value: stepValues,
              });
            }
          }),
        );
        setSavedValues(values);
        await onSaved();
        setEditing(false);
        toast.success("Feedback saved");
      }),
    [createFeedback, onSaved, steps, updateFeedback],
  );

  if (steps.length === 0) {
    return <AppCopy>No feedback questionnaire configured for this inference.</AppCopy>;
  }

  if (displayComplete && !editing) {
    return (
      <AppPanel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Inference feedback</h2>
          <AppButton type="button" variant="ghost" onClick={() => setEditing(true)}>
            <Edit3 size={15} />
            Edit
          </AppButton>
        </div>
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
      </AppPanel>
    );
  }

  return (
    <AppPanel className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Inference feedback</h2>
      <ReportQuestionnaireMount
        title="Feedback"
        schema={combined.schema}
        initialValues={savedValues ?? combined.initialValues}
        editable
        theme={theme}
        mode="standalone"
        transport={transport}
        labels={labels}
      />
    </AppPanel>
  );
}
