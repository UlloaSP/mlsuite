/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getModelPage } from "../services";
import { MODEL_CATALOG_PAGE_SIZE, modelCatalogPageQueryKey } from "./query-keys";

export const useModelCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => {
  return useQuery({
    queryKey: modelCatalogPageQueryKey(organizationId, page, search, sort, status),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryFn: () => getModelPage({ page, search, size: MODEL_CATALOG_PAGE_SIZE, sort, status }),
  });
};
