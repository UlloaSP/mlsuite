import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { PluginPageRequest } from "./dtos";
import { getPluginPage, getPluginStats } from "./services";
import {
  PLUGIN_CATALOG_PAGE_SIZE,
  PLUGIN_CATALOG_STATS_QUERY_KEY,
  pluginCatalogPageQueryKey,
} from "./hooks/query-keys";

export const pluginCatalogPageQueryOptions = (
  organizationId: number | string | undefined,
  page: number,
  type: NonNullable<PluginPageRequest["type"]>,
  search: string,
  sort: NonNullable<PluginPageRequest["sort"]>,
) =>
  queryOptions({
    queryKey: pluginCatalogPageQueryKey(organizationId, page, type, search, sort),
    queryFn: ({ signal }) =>
      getPluginPage({ page, search, size: PLUGIN_CATALOG_PAGE_SIZE, sort, type }, signal),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

export const pluginCatalogStatsQueryOptions = (organizationId: number | string | undefined) =>
  queryOptions({
    queryKey: PLUGIN_CATALOG_STATS_QUERY_KEY(organizationId ?? "none"),
    queryFn: ({ signal }) => getPluginStats(signal),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });
