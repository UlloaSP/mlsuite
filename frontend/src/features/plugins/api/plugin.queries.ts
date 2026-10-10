/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import { getPluginPage, getPluginStats } from "./plugin.api";
import { PLUGIN_CATALOG_PAGE_SIZE, pluginCatalogKeys } from "./plugin.keys";
import type { PluginCatalogSort, PluginCatalogType } from "./plugin.types";

export const pluginCatalogStatsQueryOptions = (organizationId: number | string | undefined) =>
  queryOptions({
    queryKey: pluginCatalogKeys.stats(organizationId),
    queryFn: ({ signal }) => getPluginStats(signal),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

export const usePluginCatalogPageQuery = (
  organizationId: number | string | undefined,
  type: PluginCatalogType,
  search: string,
  sort: PluginCatalogSort,
) =>
  useInfiniteCatalog({
    queryKey: [...pluginCatalogKeys.all(organizationId ?? "none"), "infinite", type, search, sort],
    queryFn: (page, signal) =>
      getPluginPage({ page, search, size: PLUGIN_CATALOG_PAGE_SIZE, sort, type }, signal),
    enabled: Boolean(organizationId),
  });

export const usePluginCatalogStatsQuery = (organizationId: number | string | undefined) =>
  useQuery(pluginCatalogStatsQueryOptions(organizationId));
