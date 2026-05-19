import type { ReviewPredictionListItemDto } from "../api/reviewLinkService";
import { formatTimestamp } from "../../models/utils";

type ReviewPredictionTrayRowProps = {
	item: ReviewPredictionListItemDto;
	active: boolean;
	tone: "revision" | "pending";
	stateLabel: string;
	onSelect: (predictionToken: string) => void;
};

export function ReviewPredictionTrayRow({
	item,
	active,
	tone,
	stateLabel,
	onSelect,
}: ReviewPredictionTrayRowProps) {
	const enteredAt = item.stateEnteredAt ?? item.prediction.createdAt;
	const statusColor = tone === "revision" ? "bg-[#16a34a]" : "bg-[#f59e0b]";
	const activeBackground = tone === "revision" ? "bg-[var(--success-quiet)]" : "bg-[var(--warning-quiet)]";

	return (
		<button
			type="button"
			onClick={() => onSelect(item.selectionToken)}
			className={`relative w-full border-b border-[var(--border-soft)] px-3 py-3 text-left transition last:border-b-0 ${
				active ? activeBackground : "bg-[var(--surface-primary)] hover:bg-[var(--surface-muted)]"
			}`}
		>
			<span className="block truncate pr-5 text-sm font-semibold text-[var(--text-primary)]">{item.prediction.name}</span>
			<span className="mt-1.5 block text-xs text-[var(--text-secondary)]">
				Entered {stateLabel} · {formatTimestamp(enteredAt)}
			</span>
			<span className={`absolute right-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full ${statusColor}`} />
		</button>
	);
}
