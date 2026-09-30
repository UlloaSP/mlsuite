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
import { ReportQuestionnaireMount } from "@/capabilities/prediction-runtime/feedback/ReportQuestionnaireMount";
import { buildQuestionnaireFormSchema } from "@/capabilities/prediction-runtime/feedback/questionnaire-schema";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import {
  isCombinedSchemaFeedbackComplete,
  isSchemaFeedbackComplete,
} from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { REVIEW_STEP_CONTEXT_EVENT } from "@/features/reviews/components/ReviewStepContextPanel";
import { useSaveSchemaReviewFeedbackMutation } from "@/features/reviews/api/review-mutations";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

type Props = {
  reviewId: string;
  reviewRunId: string;
  run: PredictionRunDto;
  version: SchemaVersionDto;
  feedback: PredictionResultFeedbackDto[];
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
  const { mutateAsync: saveFeedback } = useSaveSchemaReviewFeedbackMutation(reviewId, reviewRunId);
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
  const labels = useMemo(() => ({ submit: "Save review", submitting: "Saving review…" }), []);

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
        await saveFeedback({ steps, values });
      }),
    [saveFeedback, steps],
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
          <h2 className="text-xl font-semibold text-fg">Review questionnaire</h2>
          <AppButton variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </AppButton>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface md:col-span-2">
            {steps.map((step) => (
              <div key={step.id} className="p-4">
                <p className="text-sm font-semibold text-fg">{step.title}</p>
                {buildQuestionnaireFormSchema(step.schema).fields.map((field: FieldConfig) => (
                  <p key={String(field.id)} className="mt-2 text-sm text-fg-secondary">
                    <span className="font-medium text-fg">{String(field.label ?? field.id)}:</span>{" "}
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
      <h2 className="text-xl font-semibold text-fg">Review questionnaire</h2>
      <ReportQuestionnaireMount
        title="Schema review"
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
