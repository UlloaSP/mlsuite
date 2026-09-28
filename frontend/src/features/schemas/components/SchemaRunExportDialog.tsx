import { useMemo } from "react";
import { usePredictionRunsFeedback } from "@/features/schemas/api/schema-queries";
import { downloadSchemaRunExport } from "@/features/schemas/lib/export";
import { SchemaRunExportReviewModal } from "./SchemaRunExportReviewModal";
import {
  selectedSchemaRunExportData,
  type SchemaRunExportSelection,
} from "./schema-run-export-selection";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

type Props = {
  open: boolean;
  runs: PredictionRunDto[];
  version: SchemaVersionDto;
  onClose: () => void;
};

const feedbackForRun = (
  run: PredictionRunDto,
  feedback: readonly PredictionResultFeedbackDto[],
): PredictionResultFeedbackDto[] =>
  feedback.filter((item) => run.results.some((result) => result.id === item.resultId));

export function SchemaRunExportDialog({ open, runs, version, onClose }: Props) {
  const feedback = usePredictionRunsFeedback(runs);
  const feedbackByRun = useMemo(
    () => runs.map((run) => feedbackForRun(run, feedback.data)),
    [feedback.data, runs],
  );
  const exportSelection = (selection: SchemaRunExportSelection) => {
    const selected = selectedSchemaRunExportData(selection, runs, feedback.data);
    downloadSchemaRunExport(selected.runs, version, selected.feedback);
    onClose();
  };

  return (
    <SchemaRunExportReviewModal
      open={open}
      runs={runs}
      feedbackByRun={feedbackByRun}
      feedbackError={
        feedback.isError
          ? "Reviews could not be loaded, so the export would be incomplete."
          : undefined
      }
      feedbackLoading={feedback.isLoading}
      onClose={onClose}
      onExport={exportSelection}
    />
  );
}
