import type { FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
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

const validStatus = (value: string | null): InferenceFilters["status"] =>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const filters: InferenceFilters = {
    query: searchParams.get("q") ?? "",
    schemaId: searchParams.get("schema") ?? "all",
    bookmarkId: searchParams.get("bookmark") ?? "all",
    status: validStatus(searchParams.get("status")),
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
  const handleDelete = async (item: (typeof items)[number]) => {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    try {
      await deleteInference.mutateAsync(item.id);
      toast.success("Inference deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };
  const updateFilter = <K extends keyof InferenceFilters>(key: K, value: InferenceFilters[K]) => {
    const keyMap: Record<keyof InferenceFilters, string> = {
      query: "q",
      schemaId: "schema",
      bookmarkId: "bookmark",
      status: "status",
    };
    const next = new URLSearchParams(searchParams);
    if (value === "" || value === "all") next.delete(keyMap[key]);
    else next.set(keyMap[key], value);
    if (key === "schemaId") next.delete("bookmark");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

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
                    groupLabel: `${item.schemaName} · ${item.schemaVersionName} · v${item.schemaVersion}`,
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
          loadingLabel="Loading inferences..."
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
