/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getOrganizationPage } from "../services";
import { ORGANIZATION_CATALOG_PAGE_SIZE, organizationCatalogPageQueryKey } from "./query-keys";

export const useOrganizationCatalogPageQuery = (
  page: number,
  search: string,
  sort: string,
  filter: string,
) =>
  useQuery({
    queryKey: organizationCatalogPageQueryKey(page, search, sort, filter),
    placeholderData: keepPreviousData,
    queryFn: () =>
      getOrganizationPage({
        page,
        search,
        size: ORGANIZATION_CATALOG_PAGE_SIZE,
        sort,
        filter,
      }),
  });
