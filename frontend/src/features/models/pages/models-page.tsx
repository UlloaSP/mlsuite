/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  useArchiveModelMutation,
  useDeleteModelMutation,
  useDuplicateModelMutation,
  useRenameModelMutation,
} from "@/features/models/api/model.mutations";
import { MODEL_CATALOG_PAGE_SIZE } from "@/features/models/api/model.keys";
import { useModelCatalogPageQuery } from "@/features/models/api/model.queries";
import type { ModelDto } from "@/features/models/api/model.types";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import type { ModelAction } from "@/features/models/components/ModelActionsMenu";
import { ModelListItem } from "@/features/models/components/ModelListItem";
import { useActionDialog } from "@/shared/ui/use-action-dialog";

type ModelSortMode = "updated" | "name" | "algorithm";
type ModelStatusFilter = "active" | "archived" | "all";

const STATUS_FILTERS: Array<{ value: ModelStatusFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const SORT_OPTIONS: Array<{ value: ModelSortMode; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "name", label: "Name" },
  { value: "algorithm", label: "Algorithm" },
];

export function ModelsPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const organizationId = workspace?.currentOrganization.id;
  const controls = useCatalogControls<ModelStatusFilter, ModelSortMode>({
    filters: STATUS_FILTERS.map(({ value }) => value),
    initialFilter: "active",
    initialSort: "updated",
    sorts: SORT_OPTIONS.map(({ value }) => value),
    resetKey: organizationId,
  });
  const renameMutation = useRenameModelMutation();
  const archiveMutation = useArchiveModelMutation();
  const deleteMutation = useDeleteModelMutation();
  const duplicateMutation = useDuplicateModelMutation();
  const pageQuery = useModelCatalogPageQuery(
    organizationId,
    controls.page,
    controls.search,
    controls.sort,
    controls.filter,
  );

  const canCreateModels = workspace?.permissions.canCreateModels ?? false;
  const canDeleteModels = workspace?.permissions.canDeleteModels ?? false;
  const canEditModels = workspace?.permissions.canEditModels ?? false;

  const actionDialog = useActionDialog();
  const handleAction = async (action: ModelAction, model: ModelDto) => {
    try {
      if (action === "edit") {
        const name = await actionDialog.prompt({
          title: "Rename model",
          confirmLabel: "Save name",
          input: { label: "Model name", defaultValue: model.name },
        });
        if (name) await renameMutation.mutateAsync({ id: model.id, name, version: model.version });
        if (name) toast.success("Model renamed.");
      }
      if (action === "duplicate") {
        const name = await actionDialog.prompt({
          title: "Duplicate model",
          description: "The copy gets its own name and version history.",
          confirmLabel: "Create copy",
          input: { label: "Copy name", defaultValue: `${model.name} Copy` },
        });
        if (name) await duplicateMutation.mutateAsync({ id: model.id, name });
        if (name) toast.success("Model duplicated.");
      }
      if (
        action === "archive" &&
        (await actionDialog.confirm({
          title: `Archive ${model.name}?`,
          description: "Archived models stay readable and can be filtered from the catalog.",
          confirmLabel: "Archive",
        }))
      ) {
        await archiveMutation.mutateAsync({ id: model.id, version: model.version });
        toast.success("Model archived.");
      }
      if (
        action === "delete" &&
        (await actionDialog.confirm({
          title: `Delete ${model.name}?`,
          description: "This cannot be undone.",
          confirmLabel: "Delete",
          danger: true,
        }))
      ) {
        await deleteMutation.mutateAsync({ id: model.id, version: model.version });
        toast.success("Model deleted.");
      }
    } catch (actionError: unknown) {
      toast.error(actionError instanceof Error ? actionError.message : String(actionError));
    }
  };

  const isActionPending =
    renameMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending ||
    duplicateMutation.isPending;

  return (
    <>
      <CatalogResourcePage
        accessDenied={
          !user || Boolean(error) || Boolean(workspace && !workspace.permissions.canViewModels)
        }
        accessFallback={<NotFoundError />}
        controls={controls}
        header={{
          eyebrow: "Models",
          title: "Models",
          breadcrumbs: [{ label: "Workspace", to: "/workspace" }, { label: "Models" }],
          description: `Navigate models and inspect generated schema snapshots for ${
            workspace?.currentOrganization.name ?? "the current workspace"
          }.`,
          actions: canCreateModels ? (
            <AppButton type="button" onClick={() => navigate("/models/create")}>
              + New Model
            </AppButton>
          ) : null,
        }}
        isActionPending={isActionPending}
        loadingLabel="Loading models..."
        pageSize={MODEL_CATALOG_PAGE_SIZE}
        filterLabel="Filter by model status"
        filters={STATUS_FILTERS}
        placeholder="Search by name, file, or algorithm"
        query={pageQuery}
        sortLabel="Sort models"
        sortOptions={SORT_OPTIONS}
        emptyIcon={<Search size={22} />}
        emptyTitle="No models yet"
        filteredEmptyTitle="No matching models"
        emptyDescription="Create your first model to start building schemas."
        filteredEmptyDescription="Try another search term or status."
        emptyAction={
          canCreateModels ? (
            <AppButton type="button" onClick={() => navigate("/models/create")}>
              + New Model
            </AppButton>
          ) : undefined
        }
        renderItem={(model) => (
          <ModelListItem
            key={model.id}
            canDelete={canDeleteModels}
            canEdit={canEditModels}
            item={model}
            schemaCount={hasSchema(model) ? 1 : 0}
            onOpen={() => navigate(`/models/${model.id}`)}
            onAction={(action) => {
              void handleAction(action, model);
            }}
          />
        )}
      />
      {actionDialog.dialog}
    </>
  );
}

function hasSchema(model: ModelDto): boolean {
  return typeof model.inputSchema === "object" && Array.isArray(model.inputSchema.fields);
}
