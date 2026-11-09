import { useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { ReviewCreationButton } from "@/capabilities/review-creation/ReviewCreationButton";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import {
  useInferenceCatalogPage,
  useInferenceCatalogMetadata,
  inferenceSelectionQueryOptions,
} from "@/features/inferences/api/inference-catalog";
import { InferenceActionsMenu } from "@/features/inferences/components/InferenceActionsMenu";
import { InferenceCatalogToolbar } from "@/features/inferences/components/InferenceCatalogToolbar";
import { InferenceColumnsMenu } from "@/features/inferences/components/InferenceColumnsMenu";
import {
  InferenceFiltersDialog,
  type InferenceFilterChoice,
} from "@/features/inferences/components/InferenceFiltersDialog";
import { InferenceNameCell } from "@/features/inferences/components/InferenceNameCell";
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
import { useInferenceDeletion } from "@/features/inferences/lib/use-inference-deletion";
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
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { useSearchText } from "@/shared/lib/use-search-text";
import { useSearchFilters } from "@/shared/lib/use-search-filters";
import { inferencesSearch } from "@/features/inferences/pages/inference-search";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

const EMPTY_ROWS: InferenceTableRow[] = [];

const route = getRouteApi("/protected/app/can-view-models/inferences");

export function InferencesPage({
  renderExportAction,
}: {
  renderExportAction?: (selection: {
    count: number;
    loadItems: () => Promise<PredictionRunCatalogItemDto[]>;
  }) => ReactNode;
}) {
  const { data: workspace } = useWorkspaceContext();
  const navigate = useNavigate();
  const urlFilters = useSearchFilters(route.useSearch(), inferencesSearch);
  const { q, schema, bookmark, status, feedback, origin, where } = urlFilters.values;
  const sort = normalizeInferenceSort(urlFilters.values.sort);
  const searchBox = useSearchText(q, (value) => urlFilters.setFilters({ q: value }));
  const query = q.trim();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useMemo<InferenceFilters>(
    () => ({
      query,
      schemaId: schema,
      bookmarkId: bookmark,
      status,
      feedback,
      origin,
      conditions: parseConditions(where),
    }),
    [query, schema, bookmark, status, feedback, origin, where],
  );
  const data = useInferenceCatalogPage(filters, sort);
  const metadata = useInferenceCatalogMetadata(schema, bookmark);
  const queryClient = useQueryClient();
  const rows = useMemo<InferenceTableRow[]>(
    () =>
      data.data?.items.map((row) => ({ ...row, values: new Map(Object.entries(row.values)) })) ??
      EMPTY_ROWS,
    [data.data],
  );
  const dataColumns = metadata.data?.columns ?? [];
  const totalItems = data.data?.totalItems ?? 0;
  const organizationId = workspace?.currentOrganization.id;
  const loadItems = () =>
    queryClient.fetchQuery(inferenceSelectionQueryOptions(organizationId ?? "none", filters, sort));
  const canDelete = workspace?.permissions.canRunPredictions ?? false;
  const canManageReviews = workspace?.permissions.canManageReviews ?? false;
  const showLoading = useStableLoading(data.isLoading || metadata.isLoading);
  const deletion = useInferenceDeletion(rows);

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
      <InferenceNameCell
        id={item.id}
        name={item.name}
        selection={
          canDelete
            ? { checked: deletion.isTicked(item.id), onToggle: () => deletion.toggle(item.id) }
            : undefined
        }
      />
    ),
    renderActions: ({ item }) =>
      canDelete || canManageReviews ? (
        <InferenceActionsMenu
          canDelete={canDelete}
          canManageReviews={canManageReviews}
          disabled={deletion.removingOne}
          inferenceName={item.name}
          onDelete={() => void deletion.remove(item)}
          onReviewStatus={() =>
            navigate({
              to: "/inferences/$inferenceId",
              params: { inferenceId: String(item.id) },
              search: { tab: "reviews", section: "reviews" },
            })
          }
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
          ? "Run a schema bookmark to fill this catalog."
          : "Adjust the search or filters to see more results."
      }
    />
  ) : (
    <InferenceTable
      table={table}
      onOpen={({ item }) =>
        void navigate({ to: "/inferences/$inferenceId", params: { inferenceId: String(item.id) } })
      }
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
      {deletion.dialog}
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="Inferences"
          description="Every inference in the current organization, with each schema's inputs, outputs and reviewer answers as columns."
          actions={
            <>
              {canManageReviews && organizationId != null ? (
                <ReviewCreationButton
                  organizationId={organizationId}
                  key={organizationId}
                  count={totalItems}
                  onCreated={() => void navigate({ to: "/review/manage" })}
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
              {canDelete && deletion.selected.length > 0 ? (
                <AppButton
                  variant="danger"
                  disabled={deletion.removingSelected}
                  onClick={() => void deletion.removeSelected()}
                >
                  {deletion.removingSelected
                    ? "Deleting…"
                    : `Delete ${deletion.selected.length} selected`}
                </AppButton>
              ) : null}
            </>
          }
        />
        <InferenceCatalogToolbar
          query={searchBox.text}
          count={{ shown: totalItems, total: metadata.data?.totalItems ?? totalItems }}
          activeFilters={activeFilterCount(filters)}
          onQueryChange={searchBox.setText}
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
    </AppPage>
  );
}
