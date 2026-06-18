import { Send } from "lucide-react";
import { useRef, useState } from "react";
import { formatTimestamp } from "../../algorithms/models/utils";
import { useReviewTrayLayout } from "../../review/hooks/useReviewTrayLayout";
import { ReviewPredictionTrayGroup } from "../../review/components/ReviewPredictionTrayGroup";
import type { SchemaReviewRunListItemDto } from "../../api/review/services";

type Props = {
  items: SchemaReviewRunListItemDto[];
  selectedRunToken?: string;
  submitting?: boolean;
  onSelect: (runToken: string) => void;
  onSubmitRevision: (runTokens: string[]) => void;
};

const rowClass = (active: boolean, tone: "revision" | "pending") =>
  `relative w-full border-b border-[var(--border-soft)] px-3 py-3 text-left transition last:border-b-0 ${
    active
      ? tone === "revision"
        ? "bg-[var(--success-quiet)]"
        : "bg-[var(--warning-quiet)]"
      : "bg-[var(--surface-primary)] hover:bg-[var(--surface-muted)]"
  }`;

const statusDot = (tone: "revision" | "pending") =>
  tone === "revision" ? "bg-[#16a34a]" : "bg-[#f59e0b]";

export function SchemaReviewRunRail({
  items,
  selectedRunToken,
  submitting = false,
  onSelect,
  onSubmitRevision,
}: Props) {
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
  const revisionTokens = revision.map((item) => item.selectionToken);
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
            <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
              Review items move from pending to revision.
            </p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--text-primary)]">
            <Send size={17} />
          </span>
        </div>
        <button
          type="button"
          disabled={revisionTokens.length === 0 || submitting}
          onClick={() => onSubmitRevision(revisionTokens)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={15} />
          Send revision ({revisionTokens.length})
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
          {revision.map((item) => {
            const active = item.selectionToken === selectedRunToken;
            const enteredAt = item.stateEnteredAt ?? item.run.createdAt;
            return (
              <button
                key={item.selectionToken}
                type="button"
                onClick={() => onSelect(item.selectionToken)}
                className={rowClass(active, "revision")}
              >
                <span className="block truncate pr-5 text-sm font-semibold text-[var(--text-primary)]">
                  {item.run.name}
                </span>
                <span className="mt-1.5 block text-xs text-[var(--text-secondary)]">
                  Entered revision · {formatTimestamp(enteredAt)}
                </span>
                <span
                  className={`absolute right-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full ${statusDot("revision")}`}
                />
              </button>
            );
          })}
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
          {pending.map((item) => {
            const active = item.selectionToken === selectedRunToken;
            const enteredAt = item.stateEnteredAt ?? item.run.createdAt;
            return (
              <button
                key={item.selectionToken}
                type="button"
                onClick={() => onSelect(item.selectionToken)}
                className={rowClass(active, "pending")}
              >
                <span className="block truncate pr-5 text-sm font-semibold text-[var(--text-primary)]">
                  {item.run.name}
                </span>
                <span className="mt-1.5 block text-xs text-[var(--text-secondary)]">
                  Entered pending · {formatTimestamp(enteredAt)}
                </span>
                <span
                  className={`absolute right-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full ${statusDot("pending")}`}
                />
              </button>
            );
          })}
        </ReviewPredictionTrayGroup>
      </div>
    </aside>
  );
}
