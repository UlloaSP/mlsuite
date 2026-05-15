import { FileDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppButton, AppIconButton } from "../../app/components";
import type { ExplanationFeedbackDto, OutputFeedbackDto, PredictionDto } from "../api/modelService";
import { ExportReviewPredictionRow } from "./ExportReviewPredictionRow";
import {
	buildExportReviewSummaries,
	collectExportReviewers,
	emptyExportReviewSelection,
	type ExportReviewSelection,
} from "./export-review-selection";

type ExportReviewModalProps = {
	open: boolean;
	predictions: PredictionDto[];
	outputFeedbackByPrediction: readonly OutputFeedbackDto[][];
	explanationFeedbackByPrediction: readonly ExplanationFeedbackDto[][];
	onClose: () => void;
	onExport: (selection: ExportReviewSelection) => void;
};

export function ExportReviewModal({
	open,
	predictions,
	outputFeedbackByPrediction,
	explanationFeedbackByPrediction,
	onClose,
	onExport,
}: ExportReviewModalProps) {
	const [selection, setSelection] = useState<ExportReviewSelection>(emptyExportReviewSelection);
	const [openPredictionIds, setOpenPredictionIds] = useState<Set<string>>(new Set());
	const summaries = useMemo(() => buildExportReviewSummaries(
		predictions,
		outputFeedbackByPrediction,
		explanationFeedbackByPrediction,
	), [explanationFeedbackByPrediction, outputFeedbackByPrediction, predictions]);
	const reviewers = useMemo(() => collectExportReviewers(summaries), [summaries]);
	const selectedPredictions = predictions.length - selection.excludedPredictionIds.size;
	const selectedReviewerCount = reviewers.length - selection.excludedReviewers.size;

	if (!open) return null;

	const update = (recipe: (draft: ExportReviewSelection) => void) => {
		setSelection((current) => {
			const next = {
				excludedPredictionIds: new Set(current.excludedPredictionIds),
				excludedReviewers: new Set(current.excludedReviewers),
				excludedPredictionReviewers: new Set(current.excludedPredictionReviewers),
			};
			recipe(next);
			return next;
		});
	};
	const togglePrediction = (predictionId: string) => update((draft) => {
		if (draft.excludedPredictionIds.has(predictionId)) draft.excludedPredictionIds.delete(predictionId);
		else draft.excludedPredictionIds.add(predictionId);
	});
	const toggleReviewer = (reviewer: string) => update((draft) => {
		if (draft.excludedReviewers.has(reviewer)) draft.excludedReviewers.delete(reviewer);
		else draft.excludedReviewers.add(reviewer);
	});
	const togglePredictionReviewer = (predictionId: string, reviewer: string) => update((draft) => {
		const key = `${predictionId}::${reviewer}`;
		if (draft.excludedPredictionReviewers.has(key)) draft.excludedPredictionReviewers.delete(key);
		else draft.excludedPredictionReviewers.add(key);
	});

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
			<div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-hover)]">
				<header className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
					<div>
						<h2 className="text-2xl font-semibold">Export reviews</h2>
						<p className="mt-1 text-sm text-[var(--text-secondary)]">
							{selectedPredictions}/{predictions.length} predictions · {selectedReviewerCount}/{reviewers.length} reviewers
						</p>
					</div>
					<AppIconButton type="button" aria-label="Close" onClick={onClose} className="rounded-md">
						<X size={18} />
					</AppIconButton>
				</header>
				<div className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
					<aside className="border-r border-[var(--border-soft)] px-5 py-4">
						<p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Reviewers</p>
						<div className="max-h-[48vh] overflow-auto border-y border-[var(--border-soft)]">
							{reviewers.map((reviewer) => {
								const selected = !selection.excludedReviewers.has(reviewer);
								return (
									<button
										key={reviewer}
										type="button"
										onClick={() => toggleReviewer(reviewer)}
										className="flex w-full items-center gap-3 border-b border-[var(--border-soft)] px-2 py-3 text-left text-sm last:border-b-0 hover:bg-[var(--surface-muted)]"
									>
										<span className={`grid size-5 place-items-center rounded-md border text-xs font-semibold ${selected ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white" : "border-[var(--border-strong)] text-transparent"}`}>✓</span>
										<span className="min-w-0 truncate">{reviewer}</span>
									</button>
								);
							})}
						</div>
					</aside>
					<main className="min-h-0 overflow-auto px-6 py-4">
						<div className="mb-3 flex items-center justify-between gap-3">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Predictions</p>
							<div className="flex gap-2">
								<AppButton type="button" variant="secondary" className="rounded-md px-3 py-2" onClick={() => setSelection(emptyExportReviewSelection())}>Select all</AppButton>
								<AppButton type="button" variant="ghost" className="rounded-md px-3 py-2" onClick={() => update((draft) => predictions.forEach((item) => draft.excludedPredictionIds.add(item.id)))}>Deselect all</AppButton>
							</div>
						</div>
						<div className="border-y border-[var(--border-soft)]">
							{summaries.map((summary) => (
								<ExportReviewPredictionRow
									key={summary.prediction.id}
									summary={summary}
									open={openPredictionIds.has(summary.prediction.id)}
									selection={selection}
									onToggleOpen={() => setOpenPredictionIds((current) => {
										const next = new Set(current);
										if (next.has(summary.prediction.id)) next.delete(summary.prediction.id);
										else next.add(summary.prediction.id);
										return next;
									})}
									onTogglePrediction={togglePrediction}
									onTogglePredictionReviewer={togglePredictionReviewer}
								/>
							))}
						</div>
					</main>
				</div>
				<footer className="flex justify-end gap-3 border-t border-[var(--border-soft)] px-6 py-4">
					<AppButton type="button" variant="ghost" className="rounded-md" onClick={onClose}>Cancel</AppButton>
					<AppButton type="button" className="rounded-md" onClick={() => onExport(selection)}>
						<FileDown size={16} />
						Export CSV
					</AppButton>
				</footer>
			</div>
		</div>
	);
}
