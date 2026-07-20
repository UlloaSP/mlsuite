/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import type { PluginCatalogSort, PluginCatalogType } from "@/api/plugins/dtos";
import { pluginCatalogPageQueryOptions } from "@/api/plugins/plugin-queries";

export const usePluginCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  type: PluginCatalogType,
  search: string,
  sort: PluginCatalogSort,
) => {
  return useQuery(pluginCatalogPageQueryOptions(organizationId, page, type, search, sort));
};
