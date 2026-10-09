import { Send } from "lucide-react";
import { useState } from "react";
import { ReviewInboxGroup } from "./ReviewInboxGroup";
import { AppButton } from "@/shared/ui/AppButton";
import type { SchemaReviewRunListItemDto } from "@/shared/api/openapi.gen";

export type ReviewRailItem = SchemaReviewRunListItemDto & {
  reviewId: string;
  schemaName: string;
};

type Props = {
  revisionCount: number;
  pendingCount: number;
  selectedReviewRunId?: string;
  submitting?: boolean;
  onSelect: (item: ReviewRailItem) => void;
  onSubmitRevision: () => void;
};

export function SchemaReviewRunRail({
  revisionCount,
  pendingCount,
  selectedReviewRunId,
  submitting = false,
  onSelect,
  onSubmitRevision,
}: Props) {
  const [open, setOpen] = useState({ revision: true, pending: true });

  return (
    <aside className="flex min-h-0 flex-col rounded-card border border-line bg-surface p-5 xl:overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-fg">Review tray</p>
            <p className="mt-2 text-sm leading-5 text-fg-secondary">
              Review items move from pending to revision.
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg">
            <Send size={17} />
          </span>
        </div>
        <AppButton
          className="mt-5 w-full"
          disabled={revisionCount === 0 || submitting}
          onClick={onSubmitRevision}
        >
          <Send size={15} />
          Complete review ({revisionCount})
        </AppButton>
      </div>
      {/* Beside the review (xl) the tray has a bounded height. Each group grows to its content;
          when both overflow, the grid shares the free space equally and a group that needs less
          than half keeps its natural height while the other takes the rest. */}
      <div className="mt-5 grid content-start gap-5 xl:min-h-0 xl:flex-1 xl:grid-rows-[minmax(0,max-content)_minmax(0,max-content)] xl:overflow-hidden">
        {(["revision", "pending"] as const).map((tone) => (
          <ReviewInboxGroup
            key={tone}
            tone={tone}
            count={tone === "revision" ? revisionCount : pendingCount}
            open={open[tone]}
            selectedReviewRunId={selectedReviewRunId}
            onSelect={onSelect}
            onToggle={() => setOpen((value) => ({ ...value, [tone]: !value[tone] }))}
          />
        ))}
      </div>
    </aside>
  );
}
