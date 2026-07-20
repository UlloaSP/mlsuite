/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { pluginCatalogStatsQueryOptions } from "@/api/plugins/plugin-queries";

export const usePluginCatalogStatsQuery = (organizationId: number | string | undefined) =>
  useQuery(pluginCatalogStatsQueryOptions(organizationId));
