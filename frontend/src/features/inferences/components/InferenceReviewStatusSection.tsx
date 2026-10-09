import { MessageSquareText } from "lucide-react";
import { useReviewAssignmentCatalog } from "@/features/inferences/api/inference-review-catalog";
import { useReviewAssignmentActions } from "@/features/inferences/lib/use-review-assignment-actions";
import { reviewAssignmentHref } from "@/features/inferences/lib/review-assignment-href";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { CatalogToolbar } from "@/shared/ui/catalog/CatalogToolbar";
import { getCatalogErrorMessage } from "@/shared/ui/catalog/catalogPageUtils";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { InferenceReviewTile } from "./InferenceReviewTile";
import type { SchemaReviewAssignmentStatusDto } from "@/shared/api/openapi.gen";

type Props = {
  inferenceId: number;
  inferenceName: string;
};

type StateFilter = "all" | "completed" | "in-progress" | "pending";
type ReviewSort = "requested" | "submitted" | "reviewer";

const FILTERS: Array<{ value: StateFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "in-progress", label: "In progress" },
  { value: "pending", label: "Pending" },
];
const STATE_OF: Record<
  Exclude<StateFilter, "all">,
  SchemaReviewAssignmentStatusDto["reviewState"]
> = {
  completed: "COMPLETED",
  "in-progress": "IN_PROGRESS",
  pending: "PENDING",
};
const SORTS: Array<{ value: ReviewSort; label: string }> = [
  { value: "requested", label: "Latest requested" },
  { value: "submitted", label: "Latest submitted" },
  { value: "reviewer", label: "Reviewer" },
];

/**
 * Every reviewer assignment that includes this inference, one tile each, with
 * the catalog's usual search, state filter, and sort.
 */
export function InferenceReviewStatusSection({ inferenceId, inferenceName }: Props) {
  const actions = useReviewAssignmentActions(inferenceId, inferenceName);
  const controls = useCatalogControls<StateFilter, ReviewSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "requested",
    sorts: SORTS.map(({ value }) => value),
  });
  const assignments = useReviewAssignmentCatalog(inferenceId, {
    search: controls.search,
    filter: controls.filter === "all" ? "all" : STATE_OF[controls.filter],
    sort: controls.sort,
  });
  const pageItems = assignments.data?.items ?? [];
  const hasActiveFilters = Boolean(controls.search) || controls.filter !== "all";

  return (
    <section id="reviews" aria-label="Reviews" className="flex min-h-0 flex-1 flex-col gap-4">
      {actions.dialog}
      <CatalogToolbar
        filter={controls.filter}
        filterLabel="Filter reviews"
        filters={FILTERS}
        onFilterChange={controls.setFilter}
        onQueryChange={controls.setQuery}
        onSortChange={controls.setSort}
        placeholder="Search reviewer or requester"
        query={controls.query}
        resultCount={assignments.data?.totalItems ?? 0}
        sort={controls.sort}
        sortLabel="Sort reviews"
        sortOptions={SORTS}
      />
      <CatalogListPanel
        layout="grid"
        errorMessage={getCatalogErrorMessage(assignments.error)}
        hasNext={Boolean(assignments.hasNextPage)}
        isBusy={assignments.isFetching || actions.pending}
        isLoading={assignments.isLoading}
        itemCount={pageItems.length}
        loadingLabel="Loading reviews…"
        onRetry={() =>
          void (assignments.isFetchNextPageError
            ? assignments.fetchNextPage()
            : assignments.refetch())
        }
        onLoadMore={assignments.fetchNextPage}
        emptyState={{
          icon: <MessageSquareText size={22} />,
          title: hasActiveFilters ? "No matching reviews" : "No reviews yet",
          description: hasActiveFilters
            ? "Change the search or the status filter."
            : "No review includes this inference.",
        }}
      >
        {pageItems.map((assignment) => (
          <InferenceReviewTile
            key={`${assignment.reviewId}:${assignment.reviewRunId}:${assignment.reviewer.id}`}
            assignment={assignment}
            to={reviewAssignmentHref(inferenceId, assignment)}
            disabled={actions.pending}
            onReopen={() => actions.reopen(assignment)}
            onDelete={() => actions.remove(assignment)}
          />
        ))}
      </CatalogListPanel>
    </section>
  );
}
