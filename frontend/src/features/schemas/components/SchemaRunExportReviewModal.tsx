import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppSkeletonScope } from "@/shared/ui/AppSkeletonScope";
import { SchemaRunExportRunRow } from "./SchemaRunExportRunRow";
import {
  buildSchemaRunExportSummaries,
  collectSchemaRunExportReviewers,
  emptySchemaRunExportSelection,
  schemaRunReviewerKey,
  toggledInSet,
  type SchemaRunExportSelection,
} from "./schema-run-export-selection";
import { AppCheckMark } from "@/shared/ui/AppCheckMark";
import type { PredictionResultFeedbackDto, PredictionRunDto } from "@/shared/api/openapi.gen";

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
  const [openRunIds, setOpenRunIds] = useState<Set<number>>(new Set());
  const summaries = useMemo(
    () => buildSchemaRunExportSummaries(runs, feedbackByRun),
    [feedbackByRun, runs],
  );
  const reviewers = useMemo(() => collectSchemaRunExportReviewers(summaries), [summaries]);

  const toggleRun = (runId: number) =>
    setSelection((current) => ({
      ...current,
      excludedRunIds: toggledInSet(current.excludedRunIds, runId),
    }));
  const toggleReviewer = (reviewer: string) =>
    setSelection((current) => ({
      ...current,
      excludedReviewers: toggledInSet(current.excludedReviewers, reviewer),
    }));
  const toggleRunReviewer = (runId: number, reviewer: string) =>
    setSelection((current) => ({
      ...current,
      excludedRunReviewers: toggledInSet(
        current.excludedRunReviewers,
        schemaRunReviewerKey(runId, reviewer),
      ),
    }));

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
          <div className="flex h-40 flex-col border-y border-line lg:h-[48vh]">
            <CatalogListPanel
              scrollMemoryKey={false}
              density="flush"
              itemCount={reviewers.length}
              hasNext={false}
              isBusy={false}
              isLoading={false}
              onLoadMore={() => undefined}
              errorMessage={null}
              loadingLabel="Loading reviewers…"
              emptyState={{
                title: "No reviewers",
                description: "These inferences have no reviewer answers.",
              }}
            >
              {reviewers.map((reviewer) => {
                const selected = !selection.excludedReviewers.has(reviewer);
                return (
                  <button
                    key={reviewer}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleReviewer(reviewer)}
                    className="flex w-full items-center gap-3 border-b border-line px-2 py-3 text-left text-sm hover:bg-surface-muted"
                  >
                    <AppCheckMark checked={selected} />
                    <span className="min-w-0 truncate">{reviewer}</span>
                  </button>
                );
              })}
            </CatalogListPanel>
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
                  setSelection((current) => ({
                    ...current,
                    excludedRunIds: new Set(runs.map((item) => item.id)),
                  }))
                }
              >
                Deselect all
              </AppButton>
            </div>
          </div>
          <div className="flex h-[48vh] flex-col border-y border-line">
            <CatalogListPanel
              scrollMemoryKey={false}
              density="flush"
              itemCount={summaries.length}
              hasNext={false}
              isBusy={false}
              isLoading={false}
              onLoadMore={() => undefined}
              errorMessage={null}
              loadingLabel="Loading inferences…"
              emptyState={{
                title: "No inferences",
                description: "Select inferences to export their reviews.",
              }}
            >
              {summaries.map((summary) => (
                <SchemaRunExportRunRow
                  key={summary.run.id}
                  summary={summary}
                  open={openRunIds.has(summary.run.id)}
                  selection={selection}
                  onToggleOpen={() =>
                    setOpenRunIds((current) => toggledInSet(current, summary.run.id))
                  }
                  onToggleRun={toggleRun}
                  onToggleRunReviewer={toggleRunReviewer}
                />
              ))}
            </CatalogListPanel>
          </div>
        </section>
      </AppSkeletonScope>
    </AppDialog>
  );
}
