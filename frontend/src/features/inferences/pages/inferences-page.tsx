import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ReviewCreationButton } from "@/capabilities/review-creation/ReviewCreationButton";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useInferenceTableData } from "@/features/inferences/api/inference-api";
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
  filterInferences,
  scopeInferences,
  type InferenceFilters,
} from "@/features/inferences/lib/inference-filter";
import {
  buildInferenceTableRows,
  inferenceDataColumns,
  type InferenceTableRow,
} from "@/features/inferences/lib/inference-table-rows";
import { useInferenceTable } from "@/features/inferences/lib/use-inference-table";
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
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

const URL_FILTER_DEFAULTS = {
  q: "",
  schema: "all",
  bookmark: "all",
  status: "all",
  feedback: "all",
  where: "",
  sort: "createdAt.desc",
  inference: "",
};
const EMPTY_ROWS: InferenceTableRow[] = [];

const validStatus = (value: string): InferenceFilters["status"] =>
  value === "SUCCESS" || value === "PARTIAL_SUCCESS" || value === "FAILED" ? value : "all";
const validFeedback = (value: string): InferenceFilters["feedback"] =>
  value === "COMPLETED" || value === "PENDING" || value === "NOT_REQUIRED" ? value : "all";

export function InferencesPage({
  renderExportAction,
  renderPreview,
}: {
  renderExportAction?: (items: PredictionRunCatalogItemDto[]) => ReactNode;
  /** An inference's inputs and outputs, owned by the schemas feature. */
  renderPreview: (item: PredictionRunCatalogItemDto) => ReactNode;
}) {
  const data = useInferenceTableData();
  const { data: workspace } = useWorkspaceContext();
  const deleteInference = useDeleteInferenceMutation();
  const navigate = useNavigate();
  const actionDialog = useActionDialog();
  const urlFilters = useUrlFilters(URL_FILTER_DEFAULTS);
  const { q, schema, bookmark, status, feedback, where, sort, inference } = urlFilters.values;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useMemo<InferenceFilters>(
    () => ({
      query: q,
      schemaId: schema,
      bookmarkId: bookmark,
      status: validStatus(status),
      feedback: validFeedback(feedback),
      conditions: parseConditions(where),
    }),
    [q, schema, bookmark, status, feedback, where],
  );
  const rows = useMemo(
    () => (data.data ? buildInferenceTableRows(data.data) : EMPTY_ROWS),
    [data.data],
  );
  const dataColumns = useMemo(
    () => inferenceDataColumns(scopeInferences(rows, { schemaId: schema, bookmarkId: bookmark })),
    [rows, schema, bookmark],
  );
  const visibleRows = useMemo(() => filterInferences(rows, filters), [rows, filters]);
  const visibleItems = useMemo(() => visibleRows.map((row) => row.item), [visibleRows]);
  const organizationId = workspace?.currentOrganization.id;
  const canDelete = workspace?.permissions.canRunPredictions ?? false;
  const canManageReviews = workspace?.permissions.canManageReviews ?? false;
  const showLoading = useStableLoading(data.isLoading);
  const openRow = rows.find((row) => String(row.item.id) === inference);
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
      where: serializeConditions(choice.conditions),
    });
    setFiltersOpen(false);
  };

  const table = useInferenceTable({
    rows: visibleRows,
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
  ) : data.error && rows.length === 0 ? (
    <div className="flex flex-col items-start gap-3">
      <AppInlineAlert>Could not load inferences.</AppInlineAlert>
      <AppButton size="sm" variant="secondary" onClick={() => void data.refetch()}>
        Retry
      </AppButton>
    </div>
  ) : visibleRows.length === 0 ? (
    <AppEmptyState
      compact
      title={rows.length === 0 ? "No inferences yet" : "No matching inferences"}
      description={
        rows.length === 0
          ? "Run a schema bookmark to populate this organization catalog."
          : "Adjust the search or filters to see more results."
      }
    />
  ) : (
    <InferenceTable
      table={table}
      openId={openRow ? inference : undefined}
      onOpen={({ item }) => setOpen(String(item.id))}
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
                  candidates={visibleItems.map((item) => ({
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
                ? renderExportAction?.(visibleItems)
                : null}
            </>
          }
        />
        <InferenceCatalogToolbar
          query={q}
          count={{ shown: visibleRows.length, total: rows.length }}
          activeFilters={activeFilterCount(filters)}
          onQueryChange={(query) => urlFilters.setFilters({ q: query })}
          onOpenFilters={() => setFiltersOpen(true)}
          onClearFilters={() =>
            applyFilters({
              schemaId: "all",
              bookmarkId: "all",
              status: "all",
              feedback: "all",
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
          rows={rows}
          onApply={applyFilters}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
      {openRow ? (
        <InferencePreviewSheet item={openRow.item} onClose={() => setOpen("")}>
          {renderPreview(openRow.item)}
        </InferencePreviewSheet>
      ) : null}
    </AppPage>
  );
}
