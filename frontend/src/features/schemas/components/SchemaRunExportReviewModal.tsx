import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSkeletonScope } from "@/shared/ui/AppSkeletonScope";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
} from "@/features/schemas/api/prediction-types";
import { SchemaRunExportRunRow } from "./SchemaRunExportRunRow";
import {
  buildSchemaRunExportSummaries,
  collectSchemaRunExportReviewers,
  emptySchemaRunExportSelection,
  type SchemaRunExportSelection,
} from "./schema-run-export-selection";
import { AppCheckMark } from "@/shared/ui/AppCheckMark";

type Props = {
  open: boolean;
  runs: PredictionRunDto[];
  feedbackByRun: readonly PredictionResultFeedbackDto[][];
  /** Reviewer answers are part of the export, so it waits for them and refuses without them. */
  feedbackError?: string;
  feedbackLoading: boolean;
  onClose: () => void;
  onExport: (selection: SchemaRunExportSelection) => void;
};

export function SchemaRunExportReviewModal({
  open,
  runs,
  feedbackByRun,
  feedbackError,
  feedbackLoading,
  onClose,
  onExport,
}: Props) {
  const [selection, setSelection] = useState<SchemaRunExportSelection>(
    emptySchemaRunExportSelection,
  );
  const [openRunIds, setOpenRunIds] = useState<Set<string>>(new Set());
  const summaries = useMemo(
    () => buildSchemaRunExportSummaries(runs, feedbackByRun),
    [feedbackByRun, runs],
  );
  const reviewers = useMemo(() => collectSchemaRunExportReviewers(summaries), [summaries]);

  const update = (recipe: (draft: SchemaRunExportSelection) => void) => {
    setSelection((current) => {
      const next = {
        excludedRunIds: new Set(current.excludedRunIds),
        excludedReviewers: new Set(current.excludedReviewers),
        excludedRunReviewers: new Set(current.excludedRunReviewers),
      };
      recipe(next);
      return next;
    });
  };
  const toggleRun = (runId: string) =>
    update((draft) => {
      if (draft.excludedRunIds.has(runId)) draft.excludedRunIds.delete(runId);
      else draft.excludedRunIds.add(runId);
    });
  const toggleReviewer = (reviewer: string) =>
    update((draft) => {
      if (draft.excludedReviewers.has(reviewer)) draft.excludedReviewers.delete(reviewer);
      else draft.excludedReviewers.add(reviewer);
    });
  const toggleRunReviewer = (runId: string, reviewer: string) =>
    update((draft) => {
      const key = `${runId}::${reviewer}`;
      if (draft.excludedRunReviewers.has(key)) draft.excludedRunReviewers.delete(key);
      else draft.excludedRunReviewers.add(key);
    });

  return (
    <AppDialog
      open={open}
      size="xl"
      flush
      onClose={onClose}
      error={feedbackError}
      title="Export reviews"
      description={`${runs.length - selection.excludedRunIds.size}/${runs.length} inferences · ${reviewers.length - selection.excludedReviewers.size}/${reviewers.length} reviewers`}
      footer={
        <>
          <AppButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            type="button"
            disabled={feedbackLoading || Boolean(feedbackError)}
            onClick={() => onExport(selection)}
          >
            <FileDown size={16} />
            Export CSV
          </AppButton>
        </>
      }
    >
      <AppSkeletonScope
        className="grid lg:grid-cols-[240px_minmax(0,1fr)]"
        label="Loading reviews…"
        loading={feedbackLoading}
      >
        <aside className="border-line px-5 py-4 lg:border-r">
          <p className="mb-3 text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
            Reviewers
          </p>
          <div className="max-h-[48vh] overflow-auto border-y border-line">
            {reviewers.map((reviewer) => {
              const selected = !selection.excludedReviewers.has(reviewer);
              return (
                <button
                  key={reviewer}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleReviewer(reviewer)}
                  className="flex w-full items-center gap-3 border-b border-line px-2 py-3 text-left text-sm last:border-b-0 hover:bg-surface-muted"
                >
                  <AppCheckMark checked={selected} />
                  <span className="min-w-0 truncate">{reviewer}</span>
                </button>
              );
            })}
          </div>
        </aside>
        <section aria-label="Inferences" className="min-w-0 px-6 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
              Inferences
            </p>
            <div className="flex gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelection(emptySchemaRunExportSelection())}
              >
                Select all
              </AppButton>
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  update((draft) => runs.forEach((item) => draft.excludedRunIds.add(item.id)))
                }
              >
                Deselect all
              </AppButton>
            </div>
          </div>
          <div className="border-y border-line">
            {summaries.map((summary) => (
              <SchemaRunExportRunRow
                key={summary.run.id}
                summary={summary}
                open={openRunIds.has(summary.run.id)}
                selection={selection}
                onToggleOpen={() =>
                  setOpenRunIds((current) => {
                    const next = new Set(current);
                    if (next.has(summary.run.id)) next.delete(summary.run.id);
                    else next.add(summary.run.id);
                    return next;
                  })
                }
                onToggleRun={toggleRun}
                onToggleRunReviewer={toggleRunReviewer}
              />
            ))}
          </div>
        </section>
      </AppSkeletonScope>
    </AppDialog>
  );
}
