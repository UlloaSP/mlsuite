/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  AppBadge,
  AppButton,
  AppEmptyState,
  AppPage,
  AppPageHeader,
  AppSelect,
  AppSurface,
  AppTextField,
  AppToolbar,
} from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../api/user/hooks";
import { useWorkspaceContext } from "../../api/workspace/hooks";
import * as modelApi from "../../api/models/services";
import type { ModelAction } from "../components/ModelActionsMenu";
import { ModelListItem } from "../components/ModelListItem";
import { useGetModels } from "../../api/models/hooks";

type ModelSortMode = "updated" | "name" | "algorithm";

const isModelSchemaAvailable = (model: modelApi.ModelDto): boolean =>
  typeof model.inputSchema === "object" &&
  model.inputSchema !== null &&
  Array.isArray((model.inputSchema as Record<string, unknown>).fields);

export function ModelsPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const { data: models = [], isLoading } = useGetModels();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ModelSortMode>("updated");

  const enrichedModels = useMemo(
    () =>
      models.map((model) => ({
        model,
        schemaCount: isModelSchemaAvailable(model) ? 1 : 0,
      })),
    [models],
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
          description={`Navigate models and inspect generated schema snapshots for ${workspace?.currentOrganization.name ?? "the current workspace"}.`}
          actions={
            canCreateModels ? (
              <AppButton type="button" onClick={() => navigate("/models/create")}>
                + New Model
              </AppButton>
            ) : null
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
              onValueChange={(nextSort) => setSort(nextSort as ModelSortMode)}
              className="min-w-[180px]"
              options={[
                { value: "updated", label: "Latest updated" },
                { value: "name", label: "Name" },
                { value: "algorithm", label: "Algorithm" },
              ]}
            />
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
            {visibleItems.map(({ model, schemaCount }) => (
              <ModelListItem
                canDelete={canDeleteModels}
                canEdit={canEditModels}
                key={model.id}
                item={model}
                schemaCount={schemaCount}
                onOpen={() => navigate(`/models/${model.id}`)}
                onAction={handleMockAction}
              />
            ))}
          </div>
        )}
      </AppSurface>
    </AppPage>
  );
}
