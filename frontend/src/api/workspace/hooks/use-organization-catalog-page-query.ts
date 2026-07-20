/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { organizationCatalogPageQueryOptions } from "@/api/workspace/workspace-queries";

export const useOrganizationCatalogPageQuery = (
  page: number,
  search: string,
  sort: string,
  filter: string,
  enabled = true,
) =>
  useQuery({
    ...organizationCatalogPageQueryOptions(page, search, sort, filter),
    enabled,
  });
