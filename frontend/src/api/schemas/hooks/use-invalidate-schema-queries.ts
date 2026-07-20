/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { SCHEMA_CATALOG_PAGE_QUERY_KEY, SCHEMAS_QUERY_KEY } from "./query-keys";

export const useInvalidateSchemaQueries = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SCHEMAS_QUERY_KEY(organizationId) }),
      queryClient.invalidateQueries({ queryKey: SCHEMA_CATALOG_PAGE_QUERY_KEY(organizationId) }),
    ]);
  };
};
