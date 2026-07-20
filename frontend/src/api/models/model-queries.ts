import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { getModelPage, getModels } from "./services";
import {
  GET_MODELS_QUERY_KEY,
  MODEL_CATALOG_PAGE_SIZE,
  modelCatalogPageQueryKey,
} from "./hooks/query-keys";

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
