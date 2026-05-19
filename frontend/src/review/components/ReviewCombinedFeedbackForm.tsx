import { useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { AppCopy } from "../../app/components";
import { AppButton } from "../../app/components/ui-controls";
import type { FieldConfig } from "mlform/runtime";
import type {
  ExplanationFeedbackDto,
  OutputFeedbackDto,
  TargetDto,
} from "../../models/api/modelService";
import { ExplanationQuestionnaireMount } from "../../models/components/ExplanationQuestionnaireMount";
import { buildQuestionnaireFormSchema } from "../../models/questionnaire-schema";
import type { PredictionExplanationDescriptor } from "../../models/questionnaire-feedback";
import * as reviewApi from "../api/reviewLinkService";
import {
  buildCombinedReviewQuestionnaire,
  buildReviewFeedbackSteps,
  createReviewQuestionnaireTransport,
  valuesForStep,
} from "./reviewCombinedQuestionnaire";
import { ReviewStepContextPanel } from "./ReviewStepContextPanel";

type ReviewCombinedFeedbackFormProps = {
  token: string;
  predictionId: string;
  targets: TargetDto[];
  outputFeedbackByOrder: Map<number, OutputFeedbackDto>;
  explanationFeedbackByOrder: Map<number, ExplanationFeedbackDto>;
  reports: Record<string, unknown>[];
  signatureSchema: unknown;
  predictionValue: unknown;
  explanations: PredictionExplanationDescriptor[];
  theme: "light" | "dark";
  onSaved: () => Promise<void> | void;
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Not answered";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export function ReviewCombinedFeedbackForm(props: ReviewCombinedFeedbackFormProps) {
  const {
    token,
    predictionId,
    targets,
    outputFeedbackByOrder,
    explanationFeedbackByOrder,
    reports,
    signatureSchema,
    predictionValue,
    explanations,
    theme,
    onSaved,
  } = props;
  const steps = useMemo(
    () =>
      buildReviewFeedbackSteps({
        targets,
        outputFeedbackByOrder,
        explanationFeedbackByOrder,
        reports,
        signatureSchema,
        predictionValue,
        explanations,
      }),
    [
      explanationFeedbackByOrder,
      explanations,
      outputFeedbackByOrder,
      predictionValue,
      reports,
      signatureSchema,
      targets,
    ],
  );
  const combined = useMemo(() => buildCombinedReviewQuestionnaire(steps), [steps]);
  const complete = steps.length > 0 && steps.every((step) => step.feedback);
  const [editing, setEditing] = useReducer((_: boolean, next: boolean) => next, false);
  const [activeStepId, setActiveStepId] = useState<string | undefined>(steps[0]?.id);
  const labels = useMemo(() => ({ submit: "Save review", submitting: "Saving review..." }), []);
  const activeStep = useMemo(
    () => steps.find((step) => step.id === activeStepId) ?? steps[0],
    [activeStepId, steps],
  );
  const transport = useMemo(
    () =>
      createReviewQuestionnaireTransport(async (values) => {
        await Promise.all(
          steps.map(async (step) => {
            const stepValues = valuesForStep(values, step);
            if (step.kind === "output") {
              if (step.feedback) {
                await reviewApi.updateReviewOutputFeedback(token, {
                  outputFeedbackId: step.feedback.id,
                  value: stepValues,
                });
              } else {
                await reviewApi.createReviewOutputFeedback(token, {
                  predictionId,
                  order: step.order,
                  value: stepValues,
                });
              }
              return;
            }
            if (step.feedback) {
              await reviewApi.updateReviewExplanationFeedback(token, {
                explanationFeedbackId: step.feedback.id,
                realValue: stepValues,
              });
            } else {
              await reviewApi.createReviewExplanationFeedback(token, {
                predictionId,
                order: step.order,
                value: stepValues,
              });
            }
          }),
        );
        await onSaved();
        setEditing(false);
        toast.success("Review feedback saved");
      }),
    [onSaved, predictionId, steps, token],
  );

  useEffect(() => {
    if (!steps.some((step) => step.id === activeStepId)) {
      setActiveStepId(steps[0]?.id);
    }
  }, [activeStepId, steps]);

  if (steps.length === 0) {
    return <AppCopy>No feedback questionnaire configured for this prediction.</AppCopy>;
  }

  if (complete && !editing) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Review questionnaire</h2>
          <AppButton
            variant="secondary"
            className="rounded-none px-4 py-2"
            onClick={() => setEditing(true)}
          >
            Edit
          </AppButton>
        </div>
        <div className="divide-y divide-[var(--border-soft)] border border-[var(--border-strong)] bg-[var(--surface-primary)]">
          {steps.map((step) => (
            <div key={step.id} className="p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
              {buildQuestionnaireFormSchema(step.schema).fields.map((field: FieldConfig) => (
                <p key={String(field.id)} className="mt-2 text-sm text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">
                    {String(field.label ?? field.id)}:
                  </span>{" "}
                  {displayValue(step.initialValues[String(field.id)])}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Review questionnaire</h2>
      <div className="grid gap-5 lg:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)] lg:items-start">
        <ReviewStepContextPanel step={activeStep} />
        <ExplanationQuestionnaireMount
          title="Prediction Review"
          schema={combined.schema}
          initialValues={combined.initialValues}
          editable
          theme={theme}
          mode="standalone"
          transport={transport}
          labels={labels}
          square
          onStepChange={(stepId) => setActiveStepId(stepId ?? undefined)}
        />
      </div>
    </section>
  );
}
