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
  // Virtual rows have no intrinsic height, so each open group gets a track as tall as its rows.
  // When both do not fit, the smaller keeps its rows and the other takes what is left.
  const track = (shown: boolean, count: number) =>
    shown && count > 0 ? `minmax(8rem, calc(4rem + ${count} * 4.2rem))` : "auto";
  const groupRows = `${track(open.revision, revisionCount)} ${track(open.pending, pendingCount)}`;

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
      <div
        className="app-scroll mt-5 grid content-start gap-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto"
        style={{ gridTemplateRows: groupRows }}
      >
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
