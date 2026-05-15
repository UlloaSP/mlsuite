import { Send } from "lucide-react";
import { useRef, useState } from "react";
import type { ReviewPredictionListItemDto } from "../api/reviewLinkService";
import { useReviewTrayLayout } from "../hooks/useReviewTrayLayout";
import { normalizeReviewPredictionId } from "../reviewPredictionSelection";
import { ReviewPredictionTrayGroup } from "./ReviewPredictionTrayGroup";
import { ReviewPredictionTrayRow } from "./ReviewPredictionTrayRow";

type ReviewPredictionRailProps = {
	items: ReviewPredictionListItemDto[];
	selectedPredictionId?: string;
	submitting?: boolean;
	onSelect: (predictionId: string) => void;
	onSubmitRevision: (predictionIds: string[]) => void;
};

export function ReviewPredictionRail({
	items,
	selectedPredictionId,
	submitting = false,
	onSelect,
	onSubmitRevision,
}: ReviewPredictionRailProps) {
	const [revisionOpen, setRevisionOpen] = useState(true);
	const [pendingOpen, setPendingOpen] = useState(true);
	const bodyRef = useRef<HTMLDivElement>(null);
	const revisionSectionRef = useRef<HTMLElement>(null);
	const revisionHeaderRef = useRef<HTMLDivElement>(null);
	const revisionListRef = useRef<HTMLDivElement>(null);
	const pendingSectionRef = useRef<HTMLElement>(null);
	const pendingHeaderRef = useRef<HTMLDivElement>(null);
	const pendingListRef = useRef<HTMLDivElement>(null);
	const revision = items.filter((item) => item.reviewState === "REVISION");
	const pending = items.filter((item) => item.reviewState === "PENDING");
	const revisionIds = revision.map((item) => normalizeReviewPredictionId(item.prediction.id));
	const listHeights = useReviewTrayLayout({
		bodyRef,
		revision: {
			open: revisionOpen,
			count: revision.length,
			sectionRef: revisionSectionRef,
			headerRef: revisionHeaderRef,
			listRef: revisionListRef,
		},
		pending: {
			open: pendingOpen,
			count: pending.length,
			sectionRef: pendingSectionRef,
			headerRef: pendingHeaderRef,
			listRef: pendingListRef,
		},
	});

	return (
		<aside className="flex flex-col rounded-lg border border-[var(--border-strong)] bg-[var(--surface-primary)] p-5 lg:sticky lg:top-28 lg:h-[calc(100vh-9rem)] lg:overflow-hidden">
			<div className="shrink-0">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-xl font-semibold text-[var(--text-primary)]">Review tray</p>
						<p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">Review items move from pending to revision.</p>
					</div>
					<span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--text-primary)]">
						<Send size={17} />
					</span>
				</div>
				<button
					type="button"
					disabled={revisionIds.length === 0 || submitting}
					onClick={() => onSubmitRevision(revisionIds)}
					className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Send size={15} />
					Send revision ({revisionIds.length})
				</button>
			</div>
			<div ref={bodyRef} className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
				<ReviewPredictionTrayGroup
					title="Revision"
					subtitle="Saved and ready to send"
					count={revision.length}
					tone="revision"
					open={revisionOpen}
					listHeight={listHeights.revision}
					sectionRef={revisionSectionRef}
					headerRef={revisionHeaderRef}
					listRef={revisionListRef}
					onToggle={() => setRevisionOpen((value) => !value)}
				>
					{revision.map((item) => (
						<ReviewPredictionTrayRow
							key={item.prediction.id}
							item={item}
							active={normalizeReviewPredictionId(item.prediction.id) === selectedPredictionId}
							tone="revision"
							stateLabel="revision"
							onSelect={onSelect}
						/>
					))}
				</ReviewPredictionTrayGroup>
				<ReviewPredictionTrayGroup
					title="Pending"
					subtitle="Needs feedback"
					count={pending.length}
					tone="pending"
					open={pendingOpen}
					listHeight={listHeights.pending}
					sectionRef={pendingSectionRef}
					headerRef={pendingHeaderRef}
					listRef={pendingListRef}
					onToggle={() => setPendingOpen((value) => !value)}
				>
					{pending.map((item) => (
						<ReviewPredictionTrayRow
							key={item.prediction.id}
							item={item}
							active={normalizeReviewPredictionId(item.prediction.id) === selectedPredictionId}
							tone="pending"
							stateLabel="pending"
							onSelect={onSelect}
						/>
					))}
				</ReviewPredictionTrayGroup>
			</div>
		</aside>
	);
}
