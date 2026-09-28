import { MessageSquareText } from "lucide-react";
import { useMemo } from "react";
import {
  type InferenceReviewAssignmentDto,
  useInferenceReviewAssignments,
} from "@/features/inferences/api/inference-api";
import { useReviewAssignmentActions } from "@/features/inferences/lib/use-review-assignment-actions";
import { reviewAssignmentHref } from "@/features/inferences/lib/review-assignment-href";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { CatalogToolbar } from "@/shared/ui/catalog/CatalogToolbar";
import { getCatalogErrorMessage, getCatalogTotalPages } from "@/shared/ui/catalog/catalogPageUtils";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { InferenceReviewTile } from "./InferenceReviewTile";

type Props = {
  inferenceId: number;
  inferenceName: string;
};

type StateFilter = "all" | "completed" | "in-progress" | "pending";
type ReviewSort = "requested" | "submitted" | "reviewer";

const EMPTY: InferenceReviewAssignmentDto[] = [];
const PAGE_SIZE = 9;
const FILTERS: Array<{ value: StateFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "in-progress", label: "In progress" },
  { value: "pending", label: "Pending" },
];
const STATE_OF: Record<Exclude<StateFilter, "all">, InferenceReviewAssignmentDto["reviewState"]> = {
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
 * the catalog's usual search, state filter, sort, and pagination.
 */
export function InferenceReviewStatusSection({ inferenceId, inferenceName }: Props) {
  const assignments = useInferenceReviewAssignments(inferenceId);
  const actions = useReviewAssignmentActions(inferenceId, inferenceName);
  const controls = useCatalogControls<StateFilter, ReviewSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "requested",
    sorts: SORTS.map(({ value }) => value),
  });
  const all = assignments.data ?? EMPTY;
  const filtered = useMemo(
    () => sortAssignments(matchAssignments(all, controls.search, controls.filter), controls.sort),
    [all, controls.filter, controls.search, controls.sort],
  );
  const totalPages = getCatalogTotalPages(filtered.length, PAGE_SIZE);
  const pageItems = filtered.slice(controls.page * PAGE_SIZE, (controls.page + 1) * PAGE_SIZE);
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
        resultCount={filtered.length}
        sort={controls.sort}
        sortLabel="Sort reviews"
        sortOptions={SORTS}
      />
      <CatalogListPanel
        layout="grid"
        errorMessage={getCatalogErrorMessage(assignments.error)}
        hasNext={controls.page + 1 < totalPages}
        isBusy={assignments.isLoading || actions.pending}
        isLoading={assignments.isLoading}
        itemCount={pageItems.length}
        loadingLabel="Loading reviews…"
        onRetry={() => void assignments.refetch()}
        page={controls.page}
        setPage={controls.setPage}
        totalPages={totalPages}
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

function matchAssignments(
  assignments: InferenceReviewAssignmentDto[],
  search: string,
  filter: StateFilter,
) {
  const query = search.toLowerCase();
  return assignments.filter(
    (assignment) =>
      (filter === "all" || assignment.reviewState === STATE_OF[filter]) &&
      [assignment.reviewer, assignment.createdBy]
        .map((person) => `${person.fullName} ${person.email}`)
        .join(" ")
        .toLowerCase()
        .includes(query),
  );
}

function sortAssignments(assignments: InferenceReviewAssignmentDto[], sort: ReviewSort) {
  return [...assignments].sort((left, right) => {
    if (sort === "reviewer") return left.reviewer.fullName.localeCompare(right.reviewer.fullName);
    if (sort === "submitted")
      return (right.submittedAt ?? "").localeCompare(left.submittedAt ?? "");
    return right.createdAt.localeCompare(left.createdAt);
  });
}
