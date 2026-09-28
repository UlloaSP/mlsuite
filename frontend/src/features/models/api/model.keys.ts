/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const MODEL_CATALOG_PAGE_SIZE = 24;

/** Every model query nests under `all`, so one invalidation refreshes lists, pages, and details. */
export const modelKeys = {
  all: (organizationId: number | string) =>
    [...organizationQueryKey(organizationId), "models"] as const,
  list: (organizationId: number | string) => [...modelKeys.all(organizationId), "list"] as const,
  detail: (organizationId: number | string, modelId: string) =>
    [...modelKeys.all(organizationId), "detail", modelId] as const,
  catalogPage: (
    organizationId: number | string | undefined,
    page: number,
    search: string,
    sort: string,
    status: string,
  ) =>
    [
      ...modelKeys.all(organizationId ?? "none"),
      "catalogPage",
      page,
      MODEL_CATALOG_PAGE_SIZE,
      search,
      sort,
      status,
    ] as const,
};
