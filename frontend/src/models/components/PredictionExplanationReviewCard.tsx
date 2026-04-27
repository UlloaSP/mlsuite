/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Ref } from "react";
import { AppCopy, AppPanel } from "../../app/components";
import type { PredictionExplanationDescriptor } from "../questionnaire-feedback";
import type { ExplanationQuestionnaireMountHandle } from "./ExplanationQuestionnaireMount";
import { ExplanationQuestionnaireMount } from "./ExplanationQuestionnaireMount";
import { PredictionExplanationReport } from "./PredictionExplanationReport";

type PredictionExplanationReviewCardProps = {
  explanation: PredictionExplanationDescriptor;
  theme: "light" | "dark";
  draftValues?: Record<string, unknown>;
  questionnaireRef?: Ref<ExplanationQuestionnaireMountHandle>;
  onValuesChange?: (values: Record<string, unknown>) => void;
};

export function PredictionExplanationReviewCard({
  explanation,
  theme,
  draftValues = {},
  questionnaireRef,
  onValuesChange,
}: PredictionExplanationReviewCardProps) {
  return (
    <AppPanel className="space-y-4">
      <PredictionExplanationReport
        label={explanation.label}
        explanations={explanation.content}
        error={explanation.error}
      />
      {explanation.feedbackQuestionnaire ? (
        <ExplanationQuestionnaireMount
          ref={questionnaireRef}
          title="Explanation Feedback"
          schema={explanation.feedbackQuestionnaire}
          initialValues={draftValues}
          editable
          theme={theme}
          mode="embedded"
          onValuesChange={onValuesChange}
        />
      ) : (
        <AppCopy>No feedback questionnaire configured for this explanation.</AppCopy>
      )}
    </AppPanel>
  );
}
