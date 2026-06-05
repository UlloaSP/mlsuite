/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AppBadge, AppButton, AppSelect, AppTextField } from "../../app/components/ui-controls";
import { AppEmptyState, AppPage, AppPageHeader, AppSurface, AppToolbar } from "../../app/components/ui";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../user/hooks";
import { useWorkspaceContext } from "../../workspace/hooks";
import * as modelApi from "../api/modelService";
import { ModelListItem } from "../components/ModelListItem";
import type { ModelAction } from "../components/ModelActionsMenu";
import { GET_SIGNATURES_QUERY_KEY, useGetModels } from "../hooks";

type ModelSortMode = "updated" | "name" | "algorithm";

export function ModelsPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const { data: models = [], isLoading } = useGetModels();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ModelSortMode>("updated");

  const signatureQueries = useQueries({
    queries: models.map((model) => ({
      queryKey: GET_SIGNATURES_QUERY_KEY({ modelId: model.id }),
      queryFn: async () => modelApi.getSignatures({ modelId: model.id }),
      enabled: Boolean(model.id),
      placeholderData: [] as modelApi.SignatureDto[],
      staleTime: 5 * 60_000,
    })),
  });

  const enrichedModels = useMemo(
    () =>
      models.map((model, index) => {
        const signatures =
          (signatureQueries[index]?.data as modelApi.SignatureDto[] | undefined) ?? [];
        return {
          model,
          signatureCount: signatures.length,
        };
      }),
    [models, signatureQueries],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = enrichedModels
    .filter(({ model }) => {
      if (!normalizedQuery) {
        return true;
      }

      return [model.name, model.type, model.specificType, model.fileName].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    })
    .sort((left, right) => {
      switch (sort) {
        case "name":
          return left.model.name.localeCompare(right.model.name, undefined, {
            sensitivity: "base",
          });
        case "algorithm":
          return `${left.model.type}-${left.model.specificType}`.localeCompare(
            `${right.model.type}-${right.model.specificType}`,
            undefined,
            { sensitivity: "base" },
          );
        case "updated":
        default:
          return (
            new Date(right.model.createdAt).getTime() - new Date(left.model.createdAt).getTime()
          );
      }
    });

  if (!user || error) {
    return <NotFoundError />;
  }
  if (workspace && !workspace.permissions.canViewModels) {
    return <NotFoundError />;
  }

  const canCreateModels = workspace?.permissions.canCreateModels ?? false;
  const canDeleteModels = workspace?.permissions.canDeleteModels ?? false;
  const canEditModels = workspace?.permissions.canEditModels ?? false;

  const handleMockAction = (action: ModelAction, model: modelApi.ModelDto) => {
    const labels: Record<ModelAction, string> = {
      edit: "Edit",
      delete: "Delete",
      duplicate: "Duplicate",
    };
    toast(`${labels[action]} is not available yet for ${model.name}.`);
  };

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          eyebrow="Models"
          title="Machine Learning Models"
          description={`Navigate models, inspect derived schema metrics, and drill into prediction history for ${workspace?.currentOrganization.name ?? "the current workspace"}.`}
          aside={
            <div className="flex items-center gap-3">
              {workspace ? (
                <AppBadge tone="accent">{workspace.currentOrganization.name}</AppBadge>
              ) : null}
              {canCreateModels ? (
                <AppButton type="button" onClick={() => navigate("/models/create")}>
                  + New Model
                </AppButton>
              ) : null}
            </div>
          }
        />

        <AppToolbar>
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <AppTextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models…"
              className="min-w-[280px] flex-1"
            />

            <AppSelect
              value={sort}
              onChange={(event) => setSort(event.target.value as ModelSortMode)}
              className="min-w-[180px]"
            >
              <option value="updated">Latest updated</option>
              <option value="name">Name</option>
              <option value="algorithm">Algorithm</option>
            </AppSelect>
          </div>

          <AppBadge>{visibleItems.length} models</AppBadge>
        </AppToolbar>

        {!isLoading && visibleItems.length === 0 ? (
          <AppEmptyState
            title="No models found"
            description={
              query
                ? "No model matches the current search terms."
                : "Create your first model to start the new master-detail flow."
            }
            action={
              canCreateModels ? (
                <AppButton type="button" onClick={() => navigate("/models/create")}>
                  + New Model
                </AppButton>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {visibleItems.map(({ model, signatureCount }) => (
              <ModelListItem
                canDelete={canDeleteModels}
                canEdit={canEditModels}
                key={model.id}
                item={model}
                signatureCount={signatureCount}
                onOpen={() => navigate(`/models/${model.id}?tab=signatures`)}
                onAction={handleMockAction}
              />
            ))}
          </div>
        )}
      </AppSurface>
    </AppPage>
  );
}
