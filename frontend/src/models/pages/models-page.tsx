/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AppButton, AppPage, AppPageHeader, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../api/user/hooks";
import { useWorkspaceContext } from "../../api/workspace/hooks";
import type { ModelAction } from "../components/ModelActionsMenu";
import { ModelsCatalogBrowser } from "../components/ModelsCatalogBrowser";
import type { ModelSortMode, ModelStatusFilter } from "../components/ModelsCatalogToolbar";
import {
  useArchiveModelMutation,
  useDeleteModelMutation,
  useDuplicateModelMutation,
  useRenameModelMutation,
} from "../../api/models/hooks";
import type { ModelDto } from "../../api/models/services";

export function ModelsPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const organizationId = workspace?.currentOrganization.id;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [sort, setSort] = useState<ModelSortMode>("updated");
  const [status, setStatus] = useState<ModelStatusFilter>("active");
  const [page, setPage] = useState(0);
  const renameMutation = useRenameModelMutation();
  const archiveMutation = useArchiveModelMutation();
  const deleteMutation = useDeleteModelMutation();
  const duplicateMutation = useDuplicateModelMutation();

  useEffect(() => {
    setPage(0);
  }, [organizationId]);

  if (!user || error) {
    return <NotFoundError />;
  }
  if (workspace && !workspace.permissions.canViewModels) {
    return <NotFoundError />;
  }

  const canCreateModels = workspace?.permissions.canCreateModels ?? false;
  const canDeleteModels = workspace?.permissions.canDeleteModels ?? false;
  const canEditModels = workspace?.permissions.canEditModels ?? false;

  const handleQueryChange = (value: string) => {
    setPage(0);
    setQuery(value);
  };

  const handleSortChange = (value: ModelSortMode) => {
    setPage(0);
    setSort(value);
  };

  const handleStatusChange = (value: ModelStatusFilter) => {
    setPage(0);
    setStatus(value);
  };

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
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-hidden">
        <AppPageHeader
          eyebrow="Models"
          title="Models"
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Models" }]}
          description={`Navigate models and inspect generated schema snapshots for ${workspace?.currentOrganization.name ?? "the current workspace"}.`}
          actions={
            canCreateModels ? (
              <AppButton type="button" onClick={() => navigate("/models/create")}>
                + New Model
              </AppButton>
            ) : null
          }
        />
        <ModelsCatalogBrowser
          toolbar={{
            organizationId,
            page,
            query,
            search: deferredQuery,
            setQuery: handleQueryChange,
            setSort: handleSortChange,
            setStatus: handleStatusChange,
            sort,
            status,
          }}
          list={{
            canCreateModels,
            canDeleteModels,
            canEditModels,
            isActionPending,
            onAction: handleAction,
            onCreateModel: () => navigate("/models/create"),
            onOpenModel: (model) => navigate(`/models/${model.id}`),
            organizationId,
            page,
            search: deferredQuery,
            setPage,
            sort,
            status,
          }}
        />
      </AppSurface>
    </AppPage>
  );
}
