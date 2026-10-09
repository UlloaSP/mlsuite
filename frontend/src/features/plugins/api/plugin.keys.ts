/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const PLUGIN_CATALOG_PAGE_SIZE = 24;

/** Catalog pages and stats nest under `all`, so one invalidation refreshes both. */
export const pluginCatalogKeys = {
  all: (organizationId: number | string) =>
    [...organizationQueryKey(organizationId), "pluginCatalog"] as const,
  stats: (organizationId: number | string | undefined) =>
    [...pluginCatalogKeys.all(organizationId ?? "none"), "stats"] as const,
};
