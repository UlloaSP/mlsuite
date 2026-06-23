/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPluginPage } from "../services";
import { PLUGIN_CATALOG_PAGE_SIZE, pluginCatalogPageQueryKey } from "./query-keys";
import type { SortMode, TypeFilter } from "../../../algorithms/plugin/catalog-page-model";

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
