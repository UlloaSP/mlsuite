/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Edit3, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppButton } from "../../app/components/ui-controls";
import { AppCopy, AppPanel } from "../../app/components/ui";
import type { ExplanationFeedbackDto } from "../api/modelService";
import {
  useCreateExplanationFeedbackMutation,
  useUpdateExplanationFeedbackMutation,
} from "../hooks";
import { getEffectiveFeedbackValues } from "../questionnaire-feedback";
import { ExplanationFeedbackSummary } from "./ExplanationFeedbackSummary";
import {
  ExplanationQuestionnaireMount,
  type ExplanationQuestionnaireMountHandle,
} from "./ExplanationQuestionnaireMount";
import { PredictionExplanationReport } from "./PredictionExplanationReport";
import type { PredictionExplanationDescriptor } from "../questionnaire-feedback";

type PredictionExplanationCardProps = {
  predictionId: string;
  explanation: PredictionExplanationDescriptor;
  feedback?: ExplanationFeedbackDto;
  otherFeedback?: ExplanationFeedbackDto[];
  theme: "light" | "dark";
};

export function PredictionExplanationCard({
  predictionId,
  explanation,
  feedback,
  otherFeedback,
  theme,
}: PredictionExplanationCardProps) {
  const questionnaireRef = useRef<ExplanationQuestionnaireMountHandle | null>(null);
  const createMutation = useCreateExplanationFeedbackMutation();
  const updateMutation = useUpdateExplanationFeedbackMutation();
  const savedValues = useMemo(
    () => getEffectiveFeedbackValues(feedback, explanation.feedbackQuestionnaire),
    [explanation.feedbackQuestionnaire, feedback],
  );
  const serializedSavedValues = JSON.stringify(savedValues);
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, unknown>>(savedValues);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>(savedValues);
  const [mode, setMode] = useState<"view" | "edit">("view");

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state, react-doctor/no-derived-state, react-doctor/no-derived-state-effect, react-doctor/no-adjust-state-on-prop-change, react-doctor/no-reset-all-state-on-prop-change, react-doctor/exhaustive-deps -- Feedback refresh must reset saved snapshot, draft values, and mode together.
  useEffect(() => {
    // react-doctor-disable-next-line react-doctor/no-derived-state, react-doctor/no-adjust-state-on-prop-change, react-doctor/no-reset-all-state-on-prop-change -- Saved feedback snapshot tracks persisted server values separately from draft edits.
    setSavedSnapshot(savedValues);
    // react-doctor-disable-next-line react-doctor/no-derived-state -- Draft values intentionally fork from saved values while editing.
    setDraftValues(savedValues);
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- External feedback refresh exits edit mode.
    setMode("view");
  }, [savedValues, serializedSavedValues]);

  const handleSave = async () => {
    if (!explanation.feedbackQuestionnaire) {
      return;
    }

    try {
      const values = await questionnaireRef.current?.submit();
      if (feedback) {
        await updateMutation.mutateAsync({
          explanationFeedbackId: feedback.id,
          realValue: values ?? {},
        });
      } else {
        await createMutation.mutateAsync({
          predictionId,
          order: explanation.order,
          value: values ?? {},
        });
      }
      setSavedSnapshot(values ?? {});
      setDraftValues(values ?? {});
      setMode("view");
      toast.success("Explanation feedback saved");
    } catch (error: unknown) {
      toast.error("Explanation feedback could not be saved", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPanel className="space-y-4">
      <PredictionExplanationReport
        label={explanation.label}
        explanations={explanation.content}
        error={explanation.error}
      />
      {explanation.feedbackQuestionnaire ? (
        mode === "edit" ? (
          <div className="space-y-4">
            <ExplanationQuestionnaireMount
              ref={questionnaireRef}
              title="Explanation Feedback"
              schema={explanation.feedbackQuestionnaire}
              initialValues={draftValues}
              editable
              theme={theme}
              mode="embedded"
              onValuesChange={setDraftValues}
            />
            <div className="flex gap-3">
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraftValues(savedSnapshot);
                  setMode("view");
                }}
                className="flex-1"
              >
                Cancel
              </AppButton>
              <AppButton
                type="button"
                onClick={() => void handleSave()}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                <Save size={16} />
                Save
              </AppButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ExplanationFeedbackSummary
              schema={explanation.feedbackQuestionnaire}
              values={savedSnapshot}
            />
            <AppButton type="button" variant="ghost" onClick={() => setMode("edit")}>
              <Edit3 size={15} />
              Edit
            </AppButton>
          </div>
        )
      ) : (
        <AppCopy>No feedback questionnaire configured for this explanation.</AppCopy>
      )}

      {otherFeedback && otherFeedback.length > 0 && explanation.feedbackQuestionnaire && (
        <div className="mt-4 space-y-3 border-t border-[var(--border-soft)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Other reviews ({otherFeedback.length})
          </p>
          {otherFeedback.map((fb) => (
            <div key={fb.id} className="rounded-[14px] bg-[var(--surface-muted)] p-3">
              <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">{fb.userName}</p>
              <ExplanationFeedbackSummary
                schema={explanation.feedbackQuestionnaire!}
                values={getEffectiveFeedbackValues(fb, explanation.feedbackQuestionnaire)}
              />
            </div>
          ))}
        </div>
      )}
    </AppPanel>
  );
}
