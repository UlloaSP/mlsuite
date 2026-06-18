/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPluginStats } from "../services";
import { PLUGIN_CATALOG_STATS_QUERY_KEY } from "./query-keys";

export const usePluginCatalogStatsQuery = (organizationId: number | string | undefined) =>
  useQuery({
    queryKey: [...PLUGIN_CATALOG_STATS_QUERY_KEY, organizationId ?? "none"],
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryFn: getPluginStats,
  });
