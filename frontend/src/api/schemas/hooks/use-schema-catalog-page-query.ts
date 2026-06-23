/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSchemaPage } from "../services";
import { SCHEMA_CATALOG_PAGE_SIZE, schemaCatalogPageQueryKey } from "./query-keys";

export const useSchemaCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => {
  return useQuery({
    queryKey: schemaCatalogPageQueryKey(organizationId, page, search, sort, status),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryFn: () => getSchemaPage({ page, search, size: SCHEMA_CATALOG_PAGE_SIZE, sort, status }),
  });
};
