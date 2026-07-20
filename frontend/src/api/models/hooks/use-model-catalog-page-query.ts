/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { modelCatalogPageQueryOptions } from "@/api/models/model-queries";

export const useModelCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => {
  return useQuery(modelCatalogPageQueryOptions(organizationId, page, search, sort, status));
};
