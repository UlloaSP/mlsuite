/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SortMode, TypeFilter } from "../../../algorithms/plugin/catalog-page-model";

export const PLUGIN_CATALOG_PAGE_SIZE = 24;
export const PLUGIN_CATALOG_PAGE_QUERY_KEY = ["pluginCatalogPages"] as const;
export const PLUGIN_CATALOG_STATS_QUERY_KEY = ["pluginCatalogStats"] as const;
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
