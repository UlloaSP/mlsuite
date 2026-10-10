/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { getModel, getModelPage } from "./model.api";
import { MODEL_CATALOG_PAGE_SIZE, modelKeys } from "./model.keys";

export const modelQueryOptions = (organizationId: number | string, modelId: number | string) =>
  queryOptions({
    queryKey: modelKeys.detail(organizationId, modelId),
    queryFn: ({ signal }) => getModel(modelId, signal),
    enabled: organizationId !== "none" && Boolean(modelId),
  });

export const useModel = (modelId?: number | string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(modelQueryOptions(organizationId, modelId ?? ""));
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
  });
