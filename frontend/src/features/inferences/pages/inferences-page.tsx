import type { FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ReviewCreationButton } from "@/capabilities/review-creation/ReviewCreationButton";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import {
  type InferenceCatalogItemDto,
  useInferenceCatalog,
} from "@/features/inferences/api/inference-api";
import { useDeleteInferenceMutation } from "@/features/inferences/api/inference-mutations";
import { InferenceCatalogList } from "@/features/inferences/components/InferenceCatalogList";
import { InferenceCatalogToolbar } from "@/features/inferences/components/InferenceCatalogToolbar";
import {
  filterInferences,
  type InferenceFilters,
} from "@/features/inferences/lib/inference-filter";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useClientCatalogPage } from "@/shared/ui/catalog/useClientCatalogPage";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { useUrlFilters } from "@/shared/lib/use-url-filters";

const URL_FILTER_DEFAULTS = { q: "", schema: "all", bookmark: "all", status: "all" };
const URL_FILTER_PARAMS = {
  query: "q",
  schemaId: "schema",
  bookmarkId: "bookmark",
  status: "status",
} as const satisfies Record<keyof InferenceFilters, keyof typeof URL_FILTER_DEFAULTS>;

const validStatus = (value: string): InferenceFilters["status"] =>
  value === "SUCCESS" || value === "PARTIAL_SUCCESS" || value === "FAILED" ? value : "all";

export function InferencesPage({
  renderExportAction,
  renderFeedbackStatuses,
}: {
  renderFeedbackStatuses?: (
    items: InferenceCatalogItemDto[],
    children: (statuses: Map<string, FeedbackStatusDisplay>) => ReactNode,
  ) => ReactNode;
  renderExportAction?: (items: InferenceCatalogItemDto[]) => ReactNode;
}) {
  const catalog = useInferenceCatalog();
  const { data: workspace } = useWorkspaceContext();
  const deleteInference = useDeleteInferenceMutation();
  const urlFilters = useUrlFilters(URL_FILTER_DEFAULTS);
  const filters: InferenceFilters = {
    query: urlFilters.values.q,
    schemaId: urlFilters.values.schema,
    bookmarkId: urlFilters.values.bookmark,
    status: validStatus(urlFilters.values.status),
  };
  const items = catalog.data ?? [];
  const filteredItems = filterInferences(items, filters);
  const organizationId = workspace?.currentOrganization.id;
  const pagination = useClientCatalogPage(
    filteredItems,
    JSON.stringify([organizationId, filters]),
    catalog.isLoading,
  );
  const canDelete = workspace?.permissions.canRunPredictions ?? false;
  const canManageReviews = workspace?.permissions.canManageReviews ?? false;
  const actionDialog = useActionDialog();
  const handleDelete = async (item: (typeof items)[number]) => {
    const confirmed = await actionDialog.confirm({
      title: `Delete ${item.name}?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteInference.mutate(item.id, { onSuccess: () => toast.success("Inference deleted.") });
  };
  const updateFilter = <K extends keyof InferenceFilters>(key: K, value: InferenceFilters[K]) =>
    urlFilters.setFilters({
      [URL_FILTER_PARAMS[key]]: value,
      // Bookmarks belong to one schema, so a schema change clears the bookmark filter.
      ...(key === "schemaId" ? { bookmark: "all" } : {}),
    });

  const renderList = (statuses?: Map<string, FeedbackStatusDisplay>) => (
    <InferenceCatalogList
      feedbackStatuses={statuses}
      canDelete={canDelete}
      canManageReviews={canManageReviews}
      deletePending={deleteInference.isPending}
      items={pagination.visibleItems}
      onDelete={(item) => void handleDelete(item)}
    />
  );

  return (
    <AppPage>
      {actionDialog.dialog}
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          eyebrow="Organization"
          title="Inferences"
          description="Explore every inference in the current organization across schemas and bookmarks."
          actions={
            <>
              {workspace?.permissions.canManageReviews && organizationId != null ? (
                <ReviewCreationButton
                  organizationId={organizationId}
                  candidates={filteredItems.map((item) => ({
                    runId: String(item.id),
                    name: item.name,
                    createdAt: item.createdAt,
                    schemaId: String(item.schemaId),
                    versionId: String(item.schemaVersionId),
                    bookmarkId: item.bookmarkId == null ? null : String(item.bookmarkId),
                    bookmarkName: item.bookmarkName,
                    groupLabel: `${item.schemaName} · ${snapshotLabel(item.schemaVersionName, item.schemaVersion)}`,
                  }))}
                />
              ) : null}
              {workspace?.permissions.canExportPredictions
                ? renderExportAction?.(filteredItems)
                : null}
            </>
          }
        />
        <InferenceCatalogToolbar filters={filters} inferences={items} onChange={updateFilter} />
        <CatalogListPanel
          {...pagination}
          itemCount={filteredItems.length}
          isLoading={catalog.isLoading}
          isBusy={catalog.isFetching || deleteInference.isPending}
          loadingLabel="Loading inferences…"
          errorMessage={catalog.error ? "Could not load inferences." : null}
          onRetry={() => void catalog.refetch()}
          emptyState={{
            title: items.length === 0 ? "No inferences yet" : "No matching inferences",
            description:
              items.length === 0
                ? "Run a schema bookmark to populate this organization catalog."
                : "Adjust the search or filters to see more results.",
          }}
        >
          {renderFeedbackStatuses
            ? renderFeedbackStatuses(pagination.visibleItems, renderList)
            : renderList()}
        </CatalogListPanel>
      </AppSurface>
    </AppPage>
  );
}
