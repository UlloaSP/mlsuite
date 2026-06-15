/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { X } from "lucide-react";
import { AnimatePresence, m as motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { AppCopy, AppSectionTitle, AppIconButton } from "../../app/components";
import { showModalAtom } from "../atoms";
import {
  useCreateExplanationFeedbackMutation,
  useCreatePredictionMutation,
  useCreateTargetMutation,
  useGetPredictions,
} from "../hooks";
import { extractPredictionReportEntries } from "../report-feedback-utils";
import type { PredictionReportDescriptor } from "../questionnaire-feedback";
import { hasFeedbackValues } from "../questionnaire-feedback";
import { derivePredictionTargets } from "../derivePredictionTargets";
import { CreatePredictionModalSummary } from "./CreatePredictionModalSummary";
import type { ReportQuestionnaireMountHandle } from "./ReportQuestionnaireMount";
import { PredictionReportReviewCard } from "./PredictionReportReviewCard";
import { PredictionOverwriteDialog } from "./PredictionOverwriteDialog";

export type CreatePredictionModalProps = {
  prediction: Record<string, unknown>;
  inputs: Record<string, unknown>;
  signatureSchema: unknown;
  reportsPending: boolean;
  theme: "light" | "dark";
};

type PredictionOutput = { type?: string; execution_time?: number | string };

const asOutput = (value: Record<string, unknown>): PredictionOutput | null => {
  const outputs = value.outputs;
  if (!Array.isArray(outputs) || outputs.length === 0) {
    return null;
  }

  const first = outputs[0];
  return typeof first === "object" && first !== null ? (first as PredictionOutput) : null;
};

export function CreatePredictionModal({
  prediction,
  inputs,
  signatureSchema,
  reportsPending,
  theme,
}: CreatePredictionModalProps) {
  const { signatureId } = useParams<{ signatureId: string }>();
  const [, setShowModal] = useAtom(showModalAtom);
  const mutation = useCreatePredictionMutation();
  const mutationTarget = useCreateTargetMutation();
  const reportFeedbackMutation = useCreateExplanationFeedbackMutation();
  const { data: predictions = [] } = useGetPredictions({ signatureId: signatureId ?? "" });

  const [predictionName, setPredictionName] = useState("");
  const [draftReportValues, setDraftReportValues] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const questionnaireRefs = useRef<Record<string, ReportQuestionnaireMountHandle | null>>({});
  const reportEntries = useMemo<PredictionReportDescriptor[]>(
    () => extractPredictionReportEntries(prediction, signatureSchema),
    [prediction, signatureSchema],
  );
  const output = asOutput(prediction);
  const targets = useMemo(
    () =>
      Object.fromEntries(
        derivePredictionTargets(prediction, signatureSchema).map((target) => [
          target.order,
          target.value,
        ]),
      ),
    [prediction, signatureSchema],
  );

  const collectQuestionnaireValues = async () => {
    const submitted = await Promise.all(
      reportEntries.map(async (report) => {
        if (!report.feedbackQuestionnaire) {
          return null;
        }
        const value = await questionnaireRefs.current[report.reportId]?.submit();
        return value && hasFeedbackValues(value) ? { order: report.order, value } : null;
      }),
    );
    return submitted.filter(
      (item): item is { order: number; value: Record<string, unknown> } => item !== null,
    );
  };

  const savePrediction = async (overwrite: boolean) => {
    // react-doctor-disable-next-line react-doctor/async-parallel -- Create must finish before dependent target and feedback writes can use the prediction id.
    const created = await mutation.mutateAsync({
      signatureId: signatureId!,
      name: predictionName.trim(),
      overwrite,
      inputs,
      prediction,
    });

    await Promise.all(
      Object.entries(targets).map(([key, value]) =>
        mutationTarget.mutateAsync({
          predictionId: created.id,
          order: Number(key),
          value,
        }),
      ),
    );

    const feedbackValues = await collectQuestionnaireValues();
    await Promise.all(
      feedbackValues.map((item) =>
        reportFeedbackMutation.mutateAsync({
          predictionId: created.id,
          order: item.order,
          value: item.value,
        }),
      ),
    );

    setShowModal(false);
    toast.success("Prediction saved");
  };

  const handleSave = async () => {
    try {
      const normalizedName = predictionName.trim();
      if (predictions.some((item) => item.name === normalizedName)) {
        setShowOverwriteDialog(true);
        return;
      }

      await savePrediction(false);
    } catch (error: unknown) {
      toast.error("Prediction could not be saved", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-x-0 bottom-0 top-[88px] z-40 flex bg-black/40 backdrop-blur-sm"
        onClick={() => setShowModal(false)}
      >
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-50 m-6 flex max-h-[calc(100dvh-136px)] flex-1 flex-col overflow-hidden rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-hover)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] p-8">
            <div className="space-y-2">
              <AppCopy className="text-xs uppercase tracking-[0.22em]">Prediction Review</AppCopy>
              <AppSectionTitle className="text-4xl">Create New Prediction</AppSectionTitle>
            </div>
            <AppIconButton
              type="button"
              aria-label="Close modal"
              onClick={() => setShowModal(false)}
            >
              <X size={24} />
            </AppIconButton>
          </div>

          <div className="grid flex-1 gap-8 overflow-auto p-8 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(28rem,1.2fr)]">
            <CreatePredictionModalSummary
              outputType={output?.type}
              executionTime={output?.execution_time}
              inputs={inputs}
              targets={targets}
              signatureSchema={signatureSchema}
              predictionName={predictionName}
              onPredictionNameChange={setPredictionName}
              onCancel={() => setShowModal(false)}
              onSave={() => void handleSave()}
              isSaveDisabled={
                !predictionName.trim() ||
                reportsPending ||
                mutation.isPending ||
                mutationTarget.isPending ||
                reportFeedbackMutation.isPending
              }
            />

            <div className="space-y-6">
              {reportsPending ? <AppCopy>Waiting for report result…</AppCopy> : null}
              {reportEntries.map((report) => (
                <PredictionReportReviewCard
                  key={report.reportId}
                  report={report}
                  theme={theme}
                  draftValues={draftReportValues[report.reportId] ?? {}}
                  questionnaireRef={(handle) => {
                    questionnaireRefs.current[report.reportId] = handle;
                  }}
                  onValuesChange={(values) =>
                    setDraftReportValues((prev) => ({
                      ...prev,
                      [report.reportId]: { ...values },
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <PredictionOverwriteDialog
            open={showOverwriteDialog}
            predictionName={predictionName.trim()}
            onCancel={() => setShowOverwriteDialog(false)}
            onConfirm={async () => {
              setShowOverwriteDialog(false);
              await savePrediction(true);
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
