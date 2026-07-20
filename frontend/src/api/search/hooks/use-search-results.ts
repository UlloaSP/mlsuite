/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { searchQueryOptions } from "@/api/search/search-queries";

export const useSearchResults = (query: string) => {
  const organizationId = useCurrentOrganizationId();
  return useQuery(searchQueryOptions(organizationId, query));
};
