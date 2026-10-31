import { toast } from "sonner";
import { useDeleteReview, useManagedReviews } from "@/features/reviews/api/managed-review-catalog";
import { ManagedReviewEntry } from "@/features/reviews/components/ManagedReviewEntry";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { ManagedReviewDto } from "@/shared/api/openapi.gen";

type ReviewFilter = "all" | "open" | "expired" | "empty";
type ReviewSort = "newest";

const FILTERS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "expired", label: "Expired" },
  { value: "empty", label: "No inferences left" },
];
const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "Newest" },
];

/** Every review of the organization, for those who manage them. */
export function ReviewManagePage() {
  const controls = useCatalogControls<ReviewFilter, ReviewSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "newest",
    sorts: SORT_OPTIONS.map(({ value }) => value),
  });
  const pageQuery = useManagedReviews(controls.search, controls.filter);
  const deletion = useDeleteReview();
  const { confirm, dialog } = useActionDialog();
  const Icon = SECTION_ICONS.reviews;

  const remove = async (item: ManagedReviewDto) => {
    const confirmed = await confirm({
      title: `Delete this review of ${item.schemaName}?`,
      description:
        "The answers given in it go with it, and its reviewers stop seeing it. The inferences stay. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deletion.mutate(item.id, {
      onSuccess: () => toast.success("Review deleted."),
      onError: (failure) => toast.error(failure.message),
    });
  };

  return (
    <>
      <CatalogResourcePage
        accessFallback={<NotFoundError />}
        controls={controls}
        header={{
          title: "Manage reviews",
          description: "Every review of this organization, whoever it is assigned to.",
          breadcrumbs: [{ label: "Review", to: "/review" }, { label: "Manage reviews" }],
        }}
        isActionPending={deletion.isPending}
        loadingLabel="Loading reviews…"
        filterLabel="Filter reviews"
        filters={FILTERS}
        placeholder="Search by schema"
        query={pageQuery}
        sortLabel="Sort reviews"
        sortOptions={SORT_OPTIONS}
        emptyIcon={<Icon size={22} />}
        emptyTitle="No reviews yet"
        filteredEmptyTitle="No matching reviews"
        emptyDescription="Create a review from the Inferences page."
        filteredEmptyDescription="Try another search term or filter."
        renderItem={(item) => (
          <ManagedReviewEntry
            key={item.id}
            disabled={deletion.isPending}
            item={item}
            onDelete={() => void remove(item)}
          />
        )}
      />
      {dialog}
    </>
  );
}
