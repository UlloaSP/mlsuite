import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ReviewCreationButton } from "@/capabilities/review-creation/ReviewCreationButton";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useInference } from "@/features/inferences/api/inference-api";
import {
  useInferenceCatalogPage,
  useInferenceCatalogMetadata,
  useInferenceSelection,
} from "@/features/inferences/api/inference-catalog";
import { useDeleteInferenceMutation } from "@/features/inferences/api/inference-mutations";
import { InferenceActionsMenu } from "@/features/inferences/components/InferenceActionsMenu";
import { InferenceCatalogToolbar } from "@/features/inferences/components/InferenceCatalogToolbar";
import { InferenceColumnsMenu } from "@/features/inferences/components/InferenceColumnsMenu";
import {
  InferenceFiltersDialog,
  type InferenceFilterChoice,
} from "@/features/inferences/components/InferenceFiltersDialog";
import { InferenceNameCell } from "@/features/inferences/components/InferenceNameCell";
import { InferencePreviewSheet } from "@/features/inferences/components/InferencePreviewSheet";
import { InferenceTable } from "@/features/inferences/components/InferenceTable";
import {
  parseConditions,
  serializeConditions,
} from "@/features/inferences/lib/inference-conditions";
import {
  activeFilterCount,
  type InferenceFilters,
} from "@/features/inferences/lib/inference-filter";
import { type InferenceTableRow } from "@/features/inferences/lib/inference-table-rows";
import {
  normalizeInferenceSort,
  useInferenceTable,
} from "@/features/inferences/lib/use-inference-table";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

const URL_FILTER_DEFAULTS = {
  q: "",
  schema: "all",
  bookmark: "all",
  status: "all",
  feedback: "all",
  origin: "all",
  where: "",
  sort: "createdAt.desc",
  inference: "",
};
const EMPTY_ROWS: InferenceTableRow[] = [];

const validStatus = (value: string): InferenceFilters["status"] =>
  value === "SUCCESS" || value === "PARTIAL_SUCCESS" || value === "FAILED" ? value : "all";
const validFeedback = (value: string): InferenceFilters["feedback"] =>
  value === "COMPLETED" || value === "PENDING" || value === "NOT_REQUIRED" ? value : "all";
const validOrigin = (value: string): InferenceFilters["origin"] =>
  value === "WORKSPACE" || value === "PUBLIC" ? value : "all";

export function InferencesPage({
  renderExportAction,
  renderPreview,
}: {
  renderExportAction?: (selection: {
    count: number;
    loadItems: () => Promise<PredictionRunCatalogItemDto[]>;
  }) => ReactNode;
  /** An inference's inputs and outputs, owned by the schemas feature. */
  renderPreview: (item: PredictionRunCatalogItemDto) => ReactNode;
}) {
  const { data: workspace } = useWorkspaceContext();
  const deleteInference = useDeleteInferenceMutation();
  const navigate = useNavigate();
  const actionDialog = useActionDialog();
  const urlFilters = useUrlFilters(URL_FILTER_DEFAULTS);
  const { q, schema, bookmark, status, feedback, origin, where, inference } = urlFilters.values;
  const sort = normalizeInferenceSort(urlFilters.values.sort);
  const query = useDebouncedValue(q.trim());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useMemo<InferenceFilters>(
    () => ({
      query,
      schemaId: schema,
      bookmarkId: bookmark,
      status: validStatus(status),
      feedback: validFeedback(feedback),
      origin: validOrigin(origin),
      conditions: parseConditions(where),
    }),
    [query, schema, bookmark, status, feedback, origin, where],
  );
  const data = useInferenceCatalogPage(filters, sort);
  const metadata = useInferenceCatalogMetadata(schema, bookmark);
  const selection = useInferenceSelection(filters, sort);
  const rows = useMemo<InferenceTableRow[]>(
    () =>
      data.data?.items.map((row) => ({ ...row, values: new Map(Object.entries(row.values)) })) ??
      EMPTY_ROWS,
    [data.data],
  );
  const dataColumns = metadata.data?.columns ?? [];
  const totalItems = data.data?.totalItems ?? 0;
  const preview = useInference(inference);
  const loadItems = async () => {
    const result = await selection.refetch();
    if (result.error) throw result.error;
    return result.data ?? [];
  };
  const organizationId = workspace?.currentOrganization.id;
  const canDelete = workspace?.permissions.canRunPredictions ?? false;
  const canManageReviews = workspace?.permissions.canManageReviews ?? false;
  const showLoading = useStableLoading(data.isLoading || metadata.isLoading);
  // The clicked row opens at once; a link to a row outside the loaded pages waits for its own.
  const openItem =
    preview.data ?? rows.find((row) => String(row.item.id) === inference)?.item ?? undefined;
  const setOpen = (id: string) => urlFilters.setFilters({ inference: id });

  const handleDelete = async (item: PredictionRunCatalogItemDto) => {
    const confirmed = await actionDialog.confirm({
      title: `Delete ${item.name}?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteInference.mutate(item.id, { onSuccess: () => toast.success("Inference deleted.") });
  };
  const applyFilters = (choice: InferenceFilterChoice) => {
    urlFilters.setFilters({
      schema: choice.schemaId,
      bookmark: choice.bookmarkId,
      status: choice.status,
      feedback: choice.feedback,
      origin: choice.origin,
      where: serializeConditions(choice.conditions),
    });
    setFiltersOpen(false);
  };

  const table = useInferenceTable({
    rows,
    dataColumns,
    visibilityKey: `${organizationId ?? "none"}:${schema}`,
    scoped: schema !== "all",
    sort,
    onSortChange: (next) => urlFilters.setFilters({ sort: next }),
    renderName: ({ item }) => (
      <InferenceNameCell id={item.id} name={item.name} onOpen={() => setOpen(String(item.id))} />
    ),
    renderActions: ({ item }) =>
      canDelete || canManageReviews ? (
        <InferenceActionsMenu
          canDelete={canDelete}
          canManageReviews={canManageReviews}
          disabled={deleteInference.isPending}
          inferenceName={item.name}
          onDelete={() => void handleDelete(item)}
          onReviewStatus={() => navigate(`/inferences/${item.id}?tab=reviews&section=reviews`)}
        />
      ) : null,
  });

  const body = showLoading ? (
    <AppLoadingState label="Loading inferences…" />
  ) : (data.error && rows.length === 0) || metadata.error ? (
    <div className="flex flex-col items-start gap-3">
      <AppInlineAlert>Could not load inferences.</AppInlineAlert>
      <AppButton
        size="sm"
        variant="secondary"
        onClick={() => void (metadata.error ? metadata.refetch() : data.refetch())}
      >
        Retry
      </AppButton>
    </div>
  ) : rows.length === 0 ? (
    <AppEmptyState
      compact
      title={!metadata.data?.totalItems ? "No inferences yet" : "No matching inferences"}
      description={
        !metadata.data?.totalItems
          ? "Run a schema bookmark to populate this organization catalog."
          : "Adjust the search or filters to see more results."
      }
    />
  ) : (
    <InferenceTable
      table={table}
      openId={openItem ? inference : undefined}
      onOpen={({ item }) => setOpen(String(item.id))}
      totalItems={totalItems}
      hasNext={Boolean(data.hasNextPage)}
      isFetching={data.isFetching}
      error={Boolean(data.error)}
      onLoadMore={data.fetchNextPage}
      onRetry={() => void (data.isFetchNextPageError ? data.fetchNextPage() : data.refetch())}
    />
  );

  return (
    <AppPage>
      {actionDialog.dialog}
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          eyebrow="Organization"
          title="Inferences"
          description="Every inference in the current organization, with each schema's inputs, outputs and reviewer answers as columns."
          actions={
            <>
              {canManageReviews && organizationId != null ? (
                <ReviewCreationButton
                  organizationId={organizationId}
                  key={organizationId}
                  count={totalItems}
                  loadCandidates={async () =>
                    (await loadItems()).map((item) => ({
                      runId: String(item.id),
                      name: item.name,
                      createdAt: item.createdAt,
                      schemaId: String(item.schemaId),
                      versionId: String(item.schemaVersionId),
                      bookmarkId: item.bookmarkId == null ? null : String(item.bookmarkId),
                      bookmarkName: item.bookmarkName,
                      groupLabel: `${item.schemaName} · ${snapshotLabel(item.schemaVersionName, item.schemaVersion)}`,
                    }))
                  }
                />
              ) : null}
              {workspace?.permissions.canExportPredictions
                ? renderExportAction?.({ count: totalItems, loadItems })
                : null}
            </>
          }
        />
        <InferenceCatalogToolbar
          query={q}
          count={{ shown: totalItems, total: metadata.data?.totalItems ?? totalItems }}
          activeFilters={activeFilterCount(filters)}
          onQueryChange={(query) => urlFilters.setFilters({ q: query })}
          onOpenFilters={() => setFiltersOpen(true)}
          onClearFilters={() =>
            applyFilters({
              schemaId: "all",
              bookmarkId: "all",
              status: "all",
              feedback: "all",
              origin: "all",
              conditions: [],
            })
          }
          actions={<InferenceColumnsMenu table={table} />}
        />
        {body}
      </AppSurface>
      {filtersOpen ? (
        <InferenceFiltersDialog
          filters={filters}
          onApply={applyFilters}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
      {openItem ? (
        <InferencePreviewSheet item={openItem} onClose={() => setOpen("")}>
          {renderPreview(openItem)}
        </InferencePreviewSheet>
      ) : null}
    </AppPage>
  );
}
