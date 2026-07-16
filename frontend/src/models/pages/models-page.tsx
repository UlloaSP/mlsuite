/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  MODEL_CATALOG_PAGE_SIZE,
  useArchiveModelMutation,
  useDeleteModelMutation,
  useDuplicateModelMutation,
  useModelCatalogPageQuery,
  useRenameModelMutation,
} from "../../api/models/hooks";
import type { ModelDto } from "../../api/models/services";
import { useUser } from "../../api/user/hooks";
import { useWorkspaceContext } from "../../api/workspace/hooks";
import { AppButton, CatalogResourcePage, useCatalogControls } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import type { ModelAction } from "../components/ModelActionsMenu";
import { ModelListItem } from "../components/ModelListItem";

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
    initialFilter: "active",
    initialSort: "updated",
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

  const handleAction = async (action: ModelAction, model: ModelDto) => {
    try {
      if (action === "edit") {
        const name = window.prompt("Model name", model.name)?.trim();
        if (name) await renameMutation.mutateAsync({ id: model.id, name });
        if (name) toast.success("Model renamed.");
      }
      if (action === "duplicate") {
        const name = window.prompt("Copy name", `${model.name} Copy`)?.trim();
        if (name) await duplicateMutation.mutateAsync({ id: model.id, name });
        if (name) toast.success("Model duplicated.");
      }
      if (action === "archive" && window.confirm(`Archive ${model.name}?`)) {
        await archiveMutation.mutateAsync(model.id);
        toast.success("Model archived.");
      }
      if (action === "delete" && window.confirm(`Delete ${model.name}? This cannot be undone.`)) {
        await deleteMutation.mutateAsync(model.id);
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
  );
}

function hasSchema(model: ModelDto): boolean {
  return typeof model.inputSchema === "object" && Array.isArray(model.inputSchema.fields);
}
