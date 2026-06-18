/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deletePlugin, getPluginPage, getPluginStats, uploadPlugin } from "../../api/pluginService";
import type { SortMode, TypeFilter } from "../../../algorithms/plugin/catalog-page-model";

export const PLUGIN_CATALOG_PAGE_SIZE = 24;

const PLUGIN_CATALOG_PAGE_QUERY_KEY = ["pluginCatalogPages"] as const;
const PLUGIN_CATALOG_STATS_QUERY_KEY = ["pluginCatalogStats"] as const;

export const pluginCatalogPageQueryKey = (
  organizationId: number | string | undefined,
  page: number,
  type: TypeFilter,
  search: string,
  sort: SortMode,
) => [
  ...PLUGIN_CATALOG_PAGE_QUERY_KEY,
  organizationId ?? "none",
  page,
  PLUGIN_CATALOG_PAGE_SIZE,
  type,
  search,
  sort,
];

const useInvalidatePluginQueries = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PLUGIN_CATALOG_PAGE_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: PLUGIN_CATALOG_STATS_QUERY_KEY }),
    ]);
  };
};

export const usePluginCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  type: TypeFilter,
  search: string,
  sort: SortMode,
) => {
  return useQuery({
    queryKey: pluginCatalogPageQueryKey(organizationId, page, type, search, sort),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryFn: () => getPluginPage({ page, search, size: PLUGIN_CATALOG_PAGE_SIZE, sort, type }),
  });
};

export const usePluginCatalogStatsQuery = (organizationId: number | string | undefined) =>
  useQuery({
    queryKey: [...PLUGIN_CATALOG_STATS_QUERY_KEY, organizationId ?? "none"],
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryFn: getPluginStats,
  });

export const useUploadPluginMutation = () => {
  const invalidatePluginQueries = useInvalidatePluginQueries();
  return useMutation({
    mutationFn: uploadPlugin,
    onSuccess: invalidatePluginQueries,
  });
};

export const useDeletePluginMutation = () => {
  const invalidatePluginQueries = useInvalidatePluginQueries();
  return useMutation({
    mutationFn: deletePlugin,
    onSuccess: invalidatePluginQueries,
  });
};
