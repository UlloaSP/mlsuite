/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import {
  ORGANIZATIONS_QUERY_KEY,
  ORGANIZATION_CATALOG_PAGE_QUERY_KEY,
  WORKSPACE_CONTEXT_QUERY_KEY,
} from "./query-keys";

export const useInvalidateOrganizationQueries = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_CATALOG_PAGE_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
    ]);
  };
};
