/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import type { ModelDto } from "@/shared/api/openapi.gen";
import { getModel, getModelDetails, getModelPage } from "./model.api";
import { MODEL_CATALOG_PAGE_SIZE, modelKeys } from "./model.keys";

/** How often a shown model whose environment is being prepared is read again, until it is not. */
export const MODEL_PREPARING_POLL_MS = 5_000;

const isPreparing = (model: Pick<ModelDto, "runtimeState">) => model.runtimeState === "PREPARING";

export const modelQueryOptions = (organizationId: number | string, modelId: number | string) =>
  queryOptions({
    queryKey: modelKeys.detail(organizationId, modelId),
    queryFn: async ({ client, queryKey, signal }) => {
      const previous = client.getQueryData<ModelDto>(queryKey);
      const model = await getModel(modelId, signal);
      // Importances are read once the environment is ready, so details read before then are stale.
      if (previous && previous.runtimeState !== "READY" && model.runtimeState === "READY") {
        void client.invalidateQueries({ queryKey: modelKeys.bundle(organizationId, modelId) });
      }
      return model;
    },
    enabled: organizationId !== "none" && Boolean(modelId),
    refetchInterval: (query) =>
      query.state.data && isPreparing(query.state.data) ? MODEL_PREPARING_POLL_MS : false,
  });

export const useModel = (modelId?: number | string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(modelQueryOptions(organizationId, modelId ?? ""));
};

/**
 * What the model's bundle says about it and the environment it runs in. It changes only when the
 * environment becomes ready, and the model's query refreshes it then.
 */
export const useModelDetails = (modelId?: number | string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: modelKeys.bundle(organizationId, modelId ?? ""),
    queryFn: ({ signal }) => getModelDetails(modelId ?? "", signal),
    enabled: organizationId !== "none" && Boolean(modelId),
    staleTime: Number.POSITIVE_INFINITY,
  });
};

export const useModelCatalogPageQuery = (
  organizationId: number | string | undefined,
  search: string,
  sort: string,
  status: string,
) =>
  useInfiniteCatalog({
    queryKey: [...modelKeys.all(organizationId ?? "none"), "infinite", search, sort, status],
    queryFn: (page, signal) =>
      getModelPage({ page, search, size: MODEL_CATALOG_PAGE_SIZE, sort, status }, signal),
    enabled: Boolean(organizationId),
    refetchInterval: (pages) =>
      pages.some((page) => page.items.some(isPreparing)) ? MODEL_PREPARING_POLL_MS : false,
  });
