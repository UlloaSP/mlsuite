/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { getPluginPage, getPluginStats } from "./plugin.api";
import {
  PLUGIN_CATALOG_PAGE_SIZE,
  PLUGIN_CATALOG_STATS_QUERY_KEY,
  pluginCatalogPageQueryKey,
} from "./plugin.keys";
import type { PluginCatalogSort, PluginCatalogType } from "./plugin.types";

export const pluginCatalogPageQueryOptions = (
  organizationId: number | string | undefined,
  page: number,
  type: PluginCatalogType,
  search: string,
  sort: PluginCatalogSort,
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

export const usePluginCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  type: PluginCatalogType,
  search: string,
  sort: PluginCatalogSort,
) => useQuery(pluginCatalogPageQueryOptions(organizationId, page, type, search, sort));

export const usePluginCatalogStatsQuery = (organizationId: number | string | undefined) =>
  useQuery(pluginCatalogStatsQueryOptions(organizationId));
