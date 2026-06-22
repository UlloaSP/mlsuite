import { ChevronDown, ChevronUp } from "lucide-react";
import { formatTimestamp } from "../../algorithms/models/utils";
import {
  isSchemaRunReviewSelected,
  schemaRunReviewerKey,
  type SchemaRunExportRunSummary,
  type SchemaRunExportSelection,
} from "./schema-run-export-selection";

type Props = {
  summary: SchemaRunExportRunSummary;
  open: boolean;
  selection: SchemaRunExportSelection;
  onToggleOpen: () => void;
  onToggleRun: (runId: string) => void;
  onToggleRunReviewer: (runId: string, reviewer: string) => void;
};

const valueText = (value: unknown) =>
  typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");

export function SchemaRunExportRunRow({
  summary,
  open,
  selection,
  onToggleOpen,
  onToggleRun,
  onToggleRunReviewer,
}: Props) {
  const runId = summary.run.id;
  const runSelected = !selection.excludedRunIds.has(runId);
  const selectedReviews = summary.reviewers.filter((item) =>
    isSchemaRunReviewSelected(selection, runId, item.reviewer),
  ).length;
  return (
    <section className="border-b border-[var(--border-soft)] last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onToggleRun(runId)}
          className={`grid size-5 place-items-center rounded-md border text-xs font-semibold ${runSelected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white" : "border-[var(--border-strong)] text-transparent"}`}
          aria-label={`Toggle export for ${summary.run.name}`}
        >
          ✓
        </button>
        <button type="button" onClick={onToggleOpen} className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {summary.run.name}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {formatTimestamp(summary.run.createdAt)}
          </p>
        </button>
        <p className="text-xs font-semibold text-[var(--text-secondary)]">
          {selectedReviews}/{summary.reviewCount} reviews
        </p>
        <button
          type="button"
          onClick={onToggleOpen}
          className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-[var(--border-soft)] px-4 py-2">
          {summary.reviewers.length === 0 ? (
            <p className="py-3 text-sm text-[var(--text-secondary)]">No reviews.</p>
          ) : (
            summary.reviewers.map((reviewer) => {
              const selected = isSchemaRunReviewSelected(selection, runId, reviewer.reviewer);
              return (
                <div
                  key={schemaRunReviewerKey(runId, reviewer.reviewer)}
                  className="border-b border-[var(--border-soft)] py-3 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleRunReviewer(runId, reviewer.reviewer)}
                      className={`grid size-5 place-items-center rounded-md border text-xs font-semibold ${selected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white" : "border-[var(--border-strong)] text-transparent"}`}
                      aria-label={`Toggle ${reviewer.reviewer} for ${summary.run.name}`}
                    >
                      ✓
                    </button>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {reviewer.reviewer}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {reviewer.outputFeedback.length} output ·{" "}
                      {reviewer.explanationFeedback.length} report
                    </p>
                  </div>
                  <div className="mt-2 space-y-1 pl-8 text-xs text-[var(--text-secondary)]">
                    {reviewer.outputFeedback.map((item) => (
                      <p key={`o-${item.id}`}>
                        Output {item.order + 1}: {valueText(item.value)}
                      </p>
                    ))}
                    {reviewer.explanationFeedback.map((item) => (
                      <p key={`e-${item.id}`}>
                        Report {item.order + 1}: {valueText(item.value)}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}
