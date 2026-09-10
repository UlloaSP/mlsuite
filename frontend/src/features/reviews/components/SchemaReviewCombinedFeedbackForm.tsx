import { useAtom } from "jotai";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import type { FieldConfig } from "mlform/runtime";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { ReviewWithoutQuestionnaire } from "./ReviewWithoutQuestionnaire";
import { AppButton } from "@/shared/ui/AppButton";
import {
  buildCombinedFeedbackQuestionnaire,
  createCombinedQuestionnaireTransport,
  valuesForCombinedStep,
} from "@/capabilities/prediction-runtime/feedback/combined-feedback-questionnaire";
import { saveSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-save";
import { ReportQuestionnaireMount } from "@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount";
import { buildQuestionnaireFormSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import {
  isCombinedSchemaFeedbackComplete,
  isSchemaFeedbackComplete,
} from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import type {
  ReviewPredictionResultFeedbackDto,
  ReviewPredictionRunDto,
  ReviewSchemaVersionDto,
} from "@/features/reviews/api/review-types";
import { REVIEW_STEP_CONTEXT_EVENT } from "@/features/reviews/components/ReviewStepContextPanel";
import {
  createSchemaReviewFeedback,
  updateSchemaReviewFeedback,
} from "@/features/reviews/api/review-api";

type Props = {
  reviewId: string;
  reviewRunId: string;
  run: ReviewPredictionRunDto;
  version: ReviewSchemaVersionDto;
  feedback: ReviewPredictionResultFeedbackDto[];
  onSaved: () => Promise<unknown> | unknown;
};

const displayValue = (value: unknown, field?: FieldConfig): string => {
  if (value === null || value === undefined || value === "") return "Not answered";
  if (Array.isArray(field?.options)) {
    const options = field.options.filter(
      (option: unknown): option is { label: string; value: unknown } =>
        typeof option === "object" &&
        option !== null &&
        "value" in option &&
        "label" in option &&
        typeof option.label === "string",
    );
    const matchingOption =
      options.find(
        (option: { label: string; value: unknown }) => String(option.value) === String(value),
      ) ?? options[Number(value)];
    if (matchingOption) return matchingOption.label;
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export function SchemaReviewCombinedFeedbackForm({
  reviewId,
  reviewRunId,
  run,
  version,
  feedback,
  onSaved,
}: Props) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [editing, setEditing] = useReducer((_: boolean, next: boolean) => next, false);
  const [submitting, setSubmitting] = useState(false);
  const [savedValues, setSavedValues] = useState<Record<string, unknown> | null>(null);
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
  const activeStepIdRef = useRef<string | undefined>(undefined);
  const labels = useMemo(() => ({ submit: "Save review", submitting: "Saving review..." }), []);

  useEffect(() => {
    const firstStep = displayComplete && !editing ? undefined : steps[0];
    activeStepIdRef.current = firstStep?.id;
    window.dispatchEvent(new CustomEvent(REVIEW_STEP_CONTEXT_EVENT, { detail: firstStep }));
    return () => {
      activeStepIdRef.current = undefined;
      window.dispatchEvent(new CustomEvent(REVIEW_STEP_CONTEXT_EVENT, { detail: undefined }));
    };
  }, [displayComplete, editing, steps]);

  const transport = useMemo(
    () =>
      createCombinedQuestionnaireTransport(async (values) => {
        await saveSchemaFeedbackSteps(steps, values, {
          create: (step, target, value) =>
            createSchemaReviewFeedback(reviewId, reviewRunId, {
              resultId: target.resultId,
              type: step.type,
              order: step.order,
              value,
            }),
          update: (_step, _target, feedback, value) =>
            updateSchemaReviewFeedback(reviewId, reviewRunId, {
              feedbackId: feedback.id,
              value,
            }),
        });
      }),
    [reviewId, reviewRunId, steps],
  );

  if (steps.length === 0)
    return (
      <ReviewWithoutQuestionnaire
        reviewId={reviewId}
        reviewRunId={reviewRunId}
        onCompleted={onSaved}
      />
    );
  if (displayComplete && !editing && !submitting) {
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="divide-y divide-[var(--border-soft)] border border-[var(--border-strong)] bg-[var(--surface-primary)] md:col-span-2">
            {steps.map((step) => (
              <div key={step.id} className="p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
                {buildQuestionnaireFormSchema(step.schema).fields.map((field: FieldConfig) => (
                  <p key={String(field.id)} className="mt-2 text-sm text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">
                      {String(field.label ?? field.id)}:
                    </span>{" "}
                    {displayValue(
                      (savedValues ? valuesForCombinedStep(savedValues, step) : step.initialValues)[
                        String(field.id)
                      ],
                      field,
                    )}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Review questionnaire</h2>
      <ReportQuestionnaireMount
        title="Schema Review"
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
          toast.success("Review feedback saved");
        }}
        labels={labels}
        square
        onStepChange={(stepId) => {
          const nextId = stepId ?? steps[0]?.id;
          if (activeStepIdRef.current === nextId) return;
          activeStepIdRef.current = nextId;
          window.dispatchEvent(
            new CustomEvent(REVIEW_STEP_CONTEXT_EVENT, {
              detail: steps.find((step) => step.id === nextId) ?? steps[0],
            }),
          );
        }}
      />
    </section>
  );
}
