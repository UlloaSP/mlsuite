/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import {
  getApiClient,
  getApiUsage,
  getDocumentedModel,
  listApiAccessBookmarks,
  listApiClients,
  listApiRequests,
  type CatalogPageRequest,
  type UsagePeriod,
} from "./api-access.api";
import {
  API_ACCESS_BOOKMARKS_QUERY_KEY,
  API_CLIENTS_QUERY_KEY,
  API_CLIENT_QUERY_KEY,
  API_DOCUMENTED_MODEL_QUERY_KEY,
  API_REQUESTS_QUERY_KEY,
  API_USAGE_QUERY_KEY,
} from "./api-access.keys";

const useScope = () => useCurrentOrganizationId() ?? "none";

export function useApiClientCatalog(request: Omit<CatalogPageRequest, "page">) {
  const organizationId = useScope();
  return useInfiniteCatalog({
    queryKey: [
      ...API_CLIENTS_QUERY_KEY(organizationId),
      "infinite",
      request.size,
      request.search,
      request.filter,
      request.sort,
    ],
    queryFn: (page, signal) => listApiClients({ ...request, page }, signal),
  });
}

export const apiClientQueryOptions = (organizationId: number | string, clientId: number) =>
  queryOptions({
    queryKey: API_CLIENT_QUERY_KEY(organizationId, clientId),
    queryFn: ({ signal }) => getApiClient(clientId, signal),
  });

export const useApiClient = (clientId: number | undefined) =>
  useQuery({
    ...apiClientQueryOptions(useScope(), clientId ?? 0),
    enabled: clientId !== undefined,
  });

export const apiAccessBookmarksQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: API_ACCESS_BOOKMARKS_QUERY_KEY(organizationId),
    queryFn: ({ signal }) => listApiAccessBookmarks(signal),
  });

export const useApiAccessBookmarks = (enabled = true) =>
  useQuery({ ...apiAccessBookmarksQueryOptions(useScope()), enabled });

/** The request log, newest first; the server keeps no order but that one. */
export function useApiRequestCatalog(
  request: Omit<CatalogPageRequest, "page" | "sort">,
  clientId: number | undefined,
) {
  const organizationId = useScope();
  return useInfiniteCatalog({
    queryKey: [
      ...API_REQUESTS_QUERY_KEY(organizationId),
      clientId ?? "all",
      "infinite",
      request.size,
      request.search,
      request.filter,
    ],
    queryFn: (page, signal) => listApiRequests({ ...request, page }, clientId, signal),
    itemId: (item) => item.requestId,
  });
}

export const apiUsageQueryOptions = (
  organizationId: number | string,
  period: UsagePeriod,
  clientId?: number,
) =>
  queryOptions({
    queryKey: [...API_USAGE_QUERY_KEY(organizationId), period, clientId ?? "all"],
    queryFn: ({ signal }) => getApiUsage(period, clientId, signal),
  });

export const useApiUsage = (period: UsagePeriod, clientId?: number, enabled = true) =>
  useQuery({ ...apiUsageQueryOptions(useScope(), period, clientId), enabled });

export const documentedModelQueryOptions = (organizationId: number | string, modelId: number) =>
  queryOptions({
    queryKey: API_DOCUMENTED_MODEL_QUERY_KEY(organizationId, modelId),
    queryFn: ({ signal }) => getDocumentedModel(modelId, signal),
  });

export const useDocumentedModel = (modelId: number | null | undefined) =>
  useQuery({
    ...documentedModelQueryOptions(useScope(), modelId ?? 0),
    enabled: typeof modelId === "number",
  });
