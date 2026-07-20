/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/capabilities/workspace-context/organization-query-key";
import type { PluginCatalogSort, PluginCatalogType } from "./plugin.types";

export const PLUGIN_CATALOG_PAGE_SIZE = 24;
export const PLUGIN_CATALOG_PAGE_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "pluginCatalogPages"] as const;
export const PLUGIN_CATALOG_STATS_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "pluginCatalogStats"] as const;
export const pluginCatalogPageQueryKey = (
  organizationId: number | string | undefined,
  page: number,
  type: PluginCatalogType,
  search: string,
  sort: PluginCatalogSort,
) => [
  ...PLUGIN_CATALOG_PAGE_QUERY_KEY(organizationId ?? "none"),
  page,
  PLUGIN_CATALOG_PAGE_SIZE,
  type,
  search,
  sort,
];
