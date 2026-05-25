import { Edit3 } from "lucide-react";
import { useMemo, useReducer } from "react";
import { toast } from "sonner";
import { AppCopy, AppPanel } from "../../app/components/ui";
import { AppButton } from "../../app/components/ui-controls";
import {
  buildCombinedFeedbackQuestionnaire,
  createCombinedQuestionnaireTransport,
  type CombinedFeedbackStep,
  valuesForCombinedStep,
} from "../combined-feedback-questionnaire";
import type { ExplanationFeedbackDto, OutputFeedbackDto, TargetDto } from "../api/modelService";
import { useCreateExplanationFeedbackMutation, useUpdateExplanationFeedbackMutation, useUpdateTargetMutation } from "../hooks";
import { useCreateOutputFeedbackMutation, useUpdateOutputFeedbackMutation } from "../output-feedback-hooks";
import { createOutputFeedbackQuestionnaire, getOutputFeedbackFieldIds } from "../output-feedback-questionnaire";
import { buildOutputFeedbackInitialValues, buildTargetUpdateRequest } from "../output-feedback-values";
import type { PredictionReportDescriptor } from "../questionnaire-feedback";
import { getEffectiveFeedbackValues } from "../questionnaire-feedback";
import {
  formatProbability,
  getSchemaAwareTargetValue,
  getTargetLabel,
  getTargetProbability,
} from "../target-utils";
import { ReportFeedbackSummary } from "./ReportFeedbackSummary";
import { ReportQuestionnaireMount } from "./ReportQuestionnaireMount";

type FeedbackKind = "output" | "report";

type PredictionFeedbackStep = CombinedFeedbackStep<
  FeedbackKind,
  OutputFeedbackDto | ExplanationFeedbackDto
> & {
  target?: TargetDto;
  reportContent?: string;
  reportConfig?: Record<string, unknown>;
};

type PredictionFeedbackQuestionnaireProps = {
  predictionId: string;
  targets: TargetDto[];
  outputFeedbackByOrder: Map<number, OutputFeedbackDto>;
  reportFeedbackByOrder: Map<number, ExplanationFeedbackDto>;
  reports: Record<string, unknown>[];
  feedbackReports: PredictionReportDescriptor[];
  signatureSchema: unknown;
  predictionValue: unknown;
  theme: "light" | "dark";
  onSaved: () => Promise<void> | void;
};

const text = (value: unknown): string =>
  value === null || value === undefined || value === "" ? "No value" : String(value);

const outputDescription = (
  target: TargetDto,
  signatureSchema: unknown,
  predictionValue: unknown,
): string => {
  const value = getSchemaAwareTargetValue(
    target.value,
    signatureSchema,
    target.order,
    predictionValue,
  );
  const probability = getTargetProbability(target.value);
  return probability === null
    ? `Prediction report: ${text(value)}`
    : `Prediction report: ${text(value)} · ${formatProbability(probability)}`;
};

export function PredictionFeedbackQuestionnaire({
  predictionId,
  targets,
  outputFeedbackByOrder,
  reportFeedbackByOrder,
  reports,
  feedbackReports,
  signatureSchema,
  predictionValue,
  theme,
  onSaved,
}: PredictionFeedbackQuestionnaireProps) {
  const targetMutation = useUpdateTargetMutation();
  const createOutputFeedback = useCreateOutputFeedbackMutation();
  const updateOutputFeedback = useUpdateOutputFeedbackMutation();
  const createReportFeedback = useCreateExplanationFeedbackMutation();
  const updateReportFeedback = useUpdateExplanationFeedbackMutation();
  const [editing, setEditing] = useReducer((_: boolean, next: boolean) => next, false);

  const steps = useMemo<PredictionFeedbackStep[]>(() => {
    const outputSteps = targets.map((target, index): PredictionFeedbackStep => {
      const reportConfig = reports[target.order];
      const schema = createOutputFeedbackQuestionnaire(reportConfig, target, predictionValue);
      return {
        id: `output-${target.order}`,
        kind: "output",
        order: target.order,
        title: `Report ${index + 1}: ${getTargetLabel(signatureSchema, target.order)}`,
        description: outputDescription(target, signatureSchema, predictionValue),
        schema,
        initialValues: buildOutputFeedbackInitialValues(
          outputFeedbackByOrder.get(target.order),
          schema,
        ),
        feedback: outputFeedbackByOrder.get(target.order),
        target,
        reportConfig,
      };
    });
    const reportSteps = feedbackReports.flatMap((report, index): PredictionFeedbackStep[] => {
      if (!report.feedbackQuestionnaire) return [];
      return [
        {
          id: `report-${report.order}`,
          kind: "report",
          order: report.order,
          title: `Report ${outputSteps.length + index + 1}: ${report.label}`,
          description: `Prediction report:\n${report.content.join("\n\n")}`,
          reportContent: report.content.join("\n\n"),
          schema: report.feedbackQuestionnaire,
          initialValues: getEffectiveFeedbackValues(
            reportFeedbackByOrder.get(report.order),
            report.feedbackQuestionnaire,
          ),
          feedback: reportFeedbackByOrder.get(report.order),
        },
      ];
    });
    return [...outputSteps, ...reportSteps];
  }, [
    feedbackReports,
    outputFeedbackByOrder,
    predictionValue,
    reportFeedbackByOrder,
    reports,
    signatureSchema,
    targets,
  ]);

  const complete = steps.length > 0 && steps.every((step) => step.feedback);
  const combined = useMemo(() => buildCombinedFeedbackQuestionnaire(steps), [steps]);
  const labels = useMemo(() => ({ submit: "Save feedback", submitting: "Saving feedback…" }), []);
  const transport = useMemo(
    () =>
      createCombinedQuestionnaireTransport(async (values) => {
        await Promise.all(
          steps.map(async (step) => {
            const stepValues = valuesForCombinedStep(values, step);
            if (step.kind === "output" && step.target) {
              if (step.feedback) {
                await updateOutputFeedback.mutateAsync({
                  outputFeedbackId: step.feedback.id,
                  value: stepValues,
                });
              } else {
                await createOutputFeedback.mutateAsync({
                  predictionId,
                  order: step.order,
                  value: stepValues,
                });
              }
              const fieldIds = getOutputFeedbackFieldIds(
                typeof step.reportConfig?.kind === "string" ? step.reportConfig.kind : null,
              );
              await targetMutation.mutateAsync(
                buildTargetUpdateRequest(
                  step.target.id,
                  step.order,
                  stepValues,
                  fieldIds.assessment,
                  fieldIds.realValue,
                  signatureSchema,
                  predictionValue,
                ),
              );
              return;
            }
            const savedReport = await createReportFeedback.mutateAsync({
              predictionId,
              order: step.order,
              value: step.reportContent ?? "",
            });
            await updateReportFeedback.mutateAsync({
              explanationFeedbackId: savedReport.id,
              realValue: stepValues,
            });
          }),
        );
        await onSaved();
        setEditing(false);
        toast.success("Feedback saved");
      }),
    [
      createOutputFeedback,
      createReportFeedback,
      onSaved,
      predictionId,
      predictionValue,
      signatureSchema,
      steps,
      targetMutation,
      updateOutputFeedback,
      updateReportFeedback,
    ],
  );

  if (steps.length === 0) {
    return <AppCopy>No feedback questionnaire configured for this prediction.</AppCopy>;
  }

  if (complete && !editing) {
    return (
      <AppPanel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Prediction feedback
          </h2>
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
              values={step.initialValues}
            />
          ))}
        </div>
      </AppPanel>
    );
  }

  return (
    <AppPanel className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">Prediction feedback</h2>
      <ReportQuestionnaireMount
        title="Feedback"
        schema={combined.schema}
        initialValues={combined.initialValues}
        editable
        theme={theme}
        mode="standalone"
        transport={transport}
        labels={labels}
      />
    </AppPanel>
  );
}
