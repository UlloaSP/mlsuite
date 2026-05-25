import { ChevronDown, ChevronUp } from "lucide-react";
import type {
  ExportPredictionReviewSummary,
  ExportReviewSelection,
} from "./export-review-selection";
import { isReviewSelected, predictionReviewerKey } from "./export-review-selection";
import { formatTimestamp, getPredictionTimestamp } from "../utils";

type ExportReviewPredictionRowProps = {
  summary: ExportPredictionReviewSummary;
  open: boolean;
  selection: ExportReviewSelection;
  onToggleOpen: () => void;
  onTogglePrediction: (predictionId: string) => void;
  onTogglePredictionReviewer: (predictionId: string, reviewer: string) => void;
};

const valueText = (value: unknown) =>
  typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");

export function ExportReviewPredictionRow({
  summary,
  open,
  selection,
  onToggleOpen,
  onTogglePrediction,
  onTogglePredictionReviewer,
}: ExportReviewPredictionRowProps) {
  const predictionId = summary.prediction.id;
  const predictionSelected = !selection.excludedPredictionIds.has(predictionId);
  const selectedReviews = summary.reviewers.filter((item) =>
    isReviewSelected(selection, predictionId, item.reviewer),
  ).length;

  return (
    <section className="border-b border-[var(--border-soft)] last:border-b-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onTogglePrediction(predictionId)}
          className={`grid size-5 place-items-center rounded-md border text-xs font-semibold ${predictionSelected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white" : "border-[var(--border-strong)] text-transparent"}`}
          aria-label={`Toggle export for ${summary.prediction.name}`}
        >
          ✓
        </button>
        <button type="button" onClick={onToggleOpen} className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {summary.prediction.name}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {formatTimestamp(getPredictionTimestamp(summary.prediction))}
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
              const selected = isReviewSelected(selection, predictionId, reviewer.reviewer);
              const key = predictionReviewerKey(predictionId, reviewer.reviewer);
              return (
                <div
                  key={key}
                  className="border-b border-[var(--border-soft)] py-3 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onTogglePredictionReviewer(predictionId, reviewer.reviewer)}
                      className={`grid size-5 place-items-center rounded-md border text-xs font-semibold ${selected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white" : "border-[var(--border-strong)] text-transparent"}`}
                      aria-label={`Toggle ${reviewer.reviewer} for ${summary.prediction.name}`}
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
                        Report {item.order + 1}: {valueText(item.realValue ?? item.value)}
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
