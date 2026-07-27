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
import { InferenceCatalogTable } from "@/features/inferences/components/InferenceCatalogTable";
import { InferenceCatalogToolbar } from "@/features/inferences/components/InferenceCatalogToolbar";
import {
  filterInferences,
  type InferenceFilters,
} from "@/features/inferences/lib/inference-filter";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";

const validStatus = (value: string | null): InferenceFilters["status"] =>
  value === "SUCCESS" || value === "PARTIAL_SUCCESS" || value === "FAILED" ? value : "all";

export function InferencesPage({
  renderExportAction,
}: {
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
    setSearchParams(next, { replace: true });
  };

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
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
        {catalog.isLoading ? <AppPanel>Loading inferences...</AppPanel> : null}
        {catalog.error ? <AppPanel>Could not load inferences.</AppPanel> : null}
        {!catalog.isLoading && !catalog.error && filteredItems.length > 0 ? (
          <InferenceCatalogTable
            canDelete={canDelete}
            canManageReviews={canManageReviews}
            deletePending={deleteInference.isPending}
            items={filteredItems}
            onDelete={(item) => void handleDelete(item)}
          />
        ) : null}
        {!catalog.isLoading && !catalog.error && filteredItems.length === 0 ? (
          <AppEmptyState
            title={items.length === 0 ? "No inferences yet" : "No matching inferences"}
            description={
              items.length === 0
                ? "Run a schema bookmark to populate this organization catalog."
                : "Adjust the search or filters to see more results."
            }
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
