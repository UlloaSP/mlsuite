/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const GET_MODELS_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "getModels"] as const;
export const MODEL_CATALOG_PAGE_SIZE = 24;
export const MODEL_CATALOG_PAGE_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "modelCatalogPages"] as const;
export const CREATE_MODEL_QUERY_KEY = ["createModel"] as const;

export const modelCatalogPageQueryKey = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => [
  ...MODEL_CATALOG_PAGE_QUERY_KEY(organizationId ?? "none"),
  page,
  MODEL_CATALOG_PAGE_SIZE,
  search,
  sort,
  status,
];
