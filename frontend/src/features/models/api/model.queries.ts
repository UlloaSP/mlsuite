/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { HttpError } from "@/shared/api/http";
import { getModel, getModelPage, getModels } from "./model.api";
import { MODEL_CATALOG_PAGE_SIZE, modelKeys } from "./model.keys";

export const modelsQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: modelKeys.list(organizationId),
    queryFn: ({ signal }) => getModels(signal),
    gcTime: 10 * 60_000,
  });

export const modelQueryOptions = (organizationId: number | string, modelId: string) =>
  queryOptions({
    queryKey: modelKeys.detail(organizationId, modelId),
    queryFn: ({ signal }) => getModel(modelId, signal),
    enabled: organizationId !== "none" && Boolean(modelId),
  });

export const modelCatalogPageQueryOptions = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) =>
  queryOptions({
    queryKey: modelKeys.catalogPage(organizationId, page, search, sort, status),
    queryFn: ({ signal }) =>
      getModelPage({ page, search, size: MODEL_CATALOG_PAGE_SIZE, sort, status }, signal),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

export const useGetModels = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...modelsQueryOptions(organizationId),
    retry: (count, error) =>
      !(error instanceof HttpError && (error.status === 401 || error.status === 403)) && count < 2,
  });
};

export const useModel = (modelId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(modelQueryOptions(organizationId, modelId ?? ""));
};

export const useModelCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => useQuery(modelCatalogPageQueryOptions(organizationId, page, search, sort, status));
