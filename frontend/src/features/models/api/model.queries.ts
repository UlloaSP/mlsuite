/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { getModelPage, getModels } from "./model.api";
import {
  GET_MODELS_QUERY_KEY,
  MODEL_CATALOG_PAGE_SIZE,
  modelCatalogPageQueryKey,
} from "./model.keys";

export const modelsQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: GET_MODELS_QUERY_KEY(organizationId),
    queryFn: ({ signal }) => getModels(signal),
    gcTime: 10 * 60_000,
  });

export const modelCatalogPageQueryOptions = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) =>
  queryOptions({
    queryKey: modelCatalogPageQueryKey(organizationId, page, search, sort, status),
    queryFn: ({ signal }) =>
      getModelPage({ page, search, size: MODEL_CATALOG_PAGE_SIZE, sort, status }, signal),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

export const useGetModels = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...modelsQueryOptions(organizationId),
    retry: (count, error: unknown) => {
      const status =
        (error as { status?: number; response?: { status?: number } })?.status ??
        (error as { response?: { status?: number } })?.response?.status;
      return status !== 401 && status !== 403 && count < 2;
    },
  });
};

export const useModelCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => useQuery(modelCatalogPageQueryOptions(organizationId, page, search, sort, status));
