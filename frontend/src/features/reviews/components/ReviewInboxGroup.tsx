import { useReviewInboxCatalog } from "@/features/reviews/api/review-catalog";
import { ReviewPredictionTrayGroup } from "./ReviewPredictionTrayGroup";
import { ReviewTrayRow } from "./ReviewTrayRow";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import type { ReviewRailItem } from "./SchemaReviewRunRail";
export function ReviewInboxGroup({
  tone,
  count,
  open,
  onToggle,
  selectedReviewRunId,
  onSelect,
}: {
  tone: "revision" | "pending";
  /** The server's count for the whole group, also while it is collapsed. */
  count: number;
  open: boolean;
  onToggle: () => void;
  selectedReviewRunId?: string;
  onSelect: (item: ReviewRailItem) => void;
}) {
  const query = useReviewInboxCatalog(tone === "revision" ? "IN_PROGRESS" : "PENDING", open);
  return (
    <ReviewPredictionTrayGroup
      title={tone === "revision" ? "Revision" : "Pending"}
      subtitle={tone === "revision" ? "Saved and ready to send" : "Needs feedback"}
      count={count}
      tone={tone}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex min-h-48 flex-1 flex-col xl:min-h-0">
        <CatalogListPanel
          scrollMemoryKey={false}
          itemCount={query.data?.items.length ?? 0}
          hasNext={query.hasNextPage}
          isLoading={query.isLoading}
          isBusy={query.isFetching}
          loadingLabel="Loading review items…"
          errorMessage={query.error?.message ?? null}
          onLoadMore={() => query.fetchNextPage()}
          onRetry={() =>
            void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
          }
          emptyState={{
            title: "No review items",
            description: "Assigned inferences will appear here.",
          }}
        >
          {query.data?.items.map((item) => (
            <ReviewTrayRow
              key={item.publicId}
              item={item}
              tone={tone}
              active={item.publicId === selectedReviewRunId}
              onSelect={() => onSelect(item)}
            />
          ))}
        </CatalogListPanel>
      </div>
    </ReviewPredictionTrayGroup>
  );
}
