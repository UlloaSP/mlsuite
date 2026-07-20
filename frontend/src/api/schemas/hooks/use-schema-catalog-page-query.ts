/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { schemaCatalogPageQueryOptions } from "@/api/schemas/schema-queries";

export const useSchemaCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => {
  return useQuery(schemaCatalogPageQueryOptions(organizationId, page, search, sort, status));
};
