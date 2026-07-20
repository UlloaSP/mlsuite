/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { PLUGIN_CATALOG_PAGE_QUERY_KEY, PLUGIN_CATALOG_STATS_QUERY_KEY } from "./query-keys";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";

export const useInvalidatePluginQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: PLUGIN_CATALOG_PAGE_QUERY_KEY(organizationId) }),
      queryClient.invalidateQueries({ queryKey: PLUGIN_CATALOG_STATS_QUERY_KEY(organizationId) }),
    ]);
  };
};
