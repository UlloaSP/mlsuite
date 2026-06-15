/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Ref } from "react";
import { AppCopy, AppPanel } from "../../app/components";
import type { PredictionReportDescriptor } from "../questionnaire-feedback";
import type { ReportQuestionnaireMountHandle } from "./ReportQuestionnaireMount";
import { ReportQuestionnaireMount } from "./ReportQuestionnaireMount";
import { PredictionReportContent } from "./PredictionReportContent";

type PredictionReportReviewCardProps = {
  report: PredictionReportDescriptor;
  theme: "light" | "dark";
  draftValues?: Record<string, unknown>;
  questionnaireRef?: Ref<ReportQuestionnaireMountHandle>;
  onValuesChange?: (values: Record<string, unknown>) => void;
};

const EMPTY_DRAFT_VALUES: Record<string, unknown> = {};

export function PredictionReportReviewCard({
  report,
  theme,
  draftValues = EMPTY_DRAFT_VALUES,
  questionnaireRef,
  onValuesChange,
}: PredictionReportReviewCardProps) {
  return (
    <AppPanel className="space-y-4">
      <PredictionReportContent label={report.label} content={report.content} error={report.error} />
      {report.feedbackQuestionnaire ? (
        <ReportQuestionnaireMount
          ref={questionnaireRef}
          title="Report Feedback"
          schema={report.feedbackQuestionnaire}
          initialValues={draftValues}
          editable
          theme={theme}
          mode="embedded"
          onValuesChange={onValuesChange}
        />
      ) : (
        <AppCopy>No feedback questionnaire configured for this report.</AppCopy>
      )}
    </AppPanel>
  );
}
