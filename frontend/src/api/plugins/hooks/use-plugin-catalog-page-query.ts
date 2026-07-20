/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import type { SortMode, TypeFilter } from "@/algorithms/plugin/catalog-page-model";
import { pluginCatalogPageQueryOptions } from "@/api/plugins/plugin-queries";

export const usePluginCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  type: TypeFilter,
  search: string,
  sort: SortMode,
) => {
  return useQuery(pluginCatalogPageQueryOptions(organizationId, page, type, search, sort));
};
