/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { AppButton } from "../../app/components";
import { usePredictionRunsFeedback } from "../hooks";
import { buildSchemaRunExport, downloadSchemaRunExport } from "../../algorithms/schema/export";
import type { PredictionResultFeedbackDto, PredictionRunDto, SchemaVersionDto } from "../types";
import { SchemaRunExportReviewModal } from "./SchemaRunExportReviewModal";
import {
  selectedSchemaRunExportData,
  type SchemaRunExportSelection,
} from "./schema-run-export-selection";

type Props = {
  runs: PredictionRunDto[];
  version: SchemaVersionDto;
};

const feedbackForRun = (
  run: PredictionRunDto,
  feedback: readonly PredictionResultFeedbackDto[],
): PredictionResultFeedbackDto[] =>
  feedback.filter((item) => run.results.some((result) => result.id === item.resultId));

export function SchemaRunExportButton({ runs, version }: Props) {
  const [open, setOpen] = useState(false);
  const feedback = usePredictionRunsFeedback(runs);
  const feedbackByRun = useMemo(
    () => runs.map((run) => feedbackForRun(run, feedback.data)),
    [feedback.data, runs],
  );

  const exportSelection = (selection: SchemaRunExportSelection) => {
    const selected = selectedSchemaRunExportData(selection, runs, feedbackByRun);
    downloadSchemaRunExport(selected.runs, version, selected.feedback);
    setOpen(false);
  };

  const hasData = buildSchemaRunExport(runs, version, feedback.data).content.length > 0;
  return (
    <>
      <AppButton
        type="button"
        variant="secondary"
        disabled={runs.length === 0 || !hasData}
        onClick={() => setOpen(true)}
      >
        <FileDown size={16} />
        Export to CSV
      </AppButton>
      <SchemaRunExportReviewModal
        open={open}
        runs={runs}
        feedbackByRun={feedbackByRun}
        onClose={() => setOpen(false)}
        onExport={exportSelection}
      />
    </>
  );
}
