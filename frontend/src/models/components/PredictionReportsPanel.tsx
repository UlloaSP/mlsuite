/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { ExplanationFeedbackDto, TargetDto } from "../api/modelService";
import type { PredictionReportDescriptor } from "../questionnaire-feedback";
import { getFormattedReportContent } from "../report-feedback-utils";
import {
  formatProbability,
  getSchemaAwareTargetValue,
  getTargetLabel,
  getTargetProbability,
} from "../target-utils";
import { PredictionReportContent } from "./PredictionReportContent";

type PredictionReportsPanelProps = {
  open: boolean;
  onToggle: () => void;
  targets: TargetDto[];
  reports?: PredictionReportDescriptor[];
  reportFeedbackByOrder?: Map<number, ExplanationFeedbackDto>;
  signatureSchema?: unknown;
  predictionValue?: unknown;
};

const EMPTY_REPORTS: PredictionReportDescriptor[] = [];

export function PredictionReportsPanel({
  open,
  onToggle,
  targets,
  reports = EMPTY_REPORTS,
  reportFeedbackByOrder,
  signatureSchema,
  predictionValue,
}: PredictionReportsPanelProps) {
  return (
    <AppPanel className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <AppSectionTitle>Reports</AppSectionTitle>
          <AppCopy>Predicted outputs and generated reports returned by the model.</AppCopy>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open ? (
        <div className="grid gap-3 md:grid-cols-2">
          {targets.map((target, index) => (
            <div key={target.id} className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3">
              <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                Report {index + 1}: {getTargetLabel(signatureSchema, target.order)}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {getTargetLabel(signatureSchema, target.order)}
              </p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
                {String(
                  getSchemaAwareTargetValue(
                    target.value,
                    signatureSchema,
                    target.order,
                    predictionValue,
                  ) ?? "",
                )}
              </p>
              {getTargetProbability(target.value) !== null ? (
                <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                  Probability {formatProbability(getTargetProbability(target.value)!)}
                </p>
              ) : null}
            </div>
          ))}
          {reports.map((report, index) => {
            const feedbackContent = getFormattedReportContent(
              reportFeedbackByOrder?.get(report.order)?.value,
            );
            const content = report.content.length > 0 ? report.content : feedbackContent;
            return (
              <div
                key={report.reportId}
                className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3"
              >
                <PredictionReportContent
                  label={`Report ${targets.length + index + 1}: ${report.label}`}
                  content={content}
                  error={report.error}
                />
                {!report.error && content.length === 0 ? (
                  <AppCopy>No report content returned.</AppCopy>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </AppPanel>
  );
}
