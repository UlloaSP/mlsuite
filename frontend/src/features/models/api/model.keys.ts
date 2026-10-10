/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const MODEL_CATALOG_PAGE_SIZE = 24;

/** Every model query nests under `all`, so one invalidation refreshes catalogs and details. */
export const modelKeys = {
  all: (organizationId: number | string) =>
    [...organizationQueryKey(organizationId), "models"] as const,
  // Route params are strings and DTO ids numbers; the key holds a string so both match.
  detail: (organizationId: number | string, modelId: number | string) =>
    [...modelKeys.all(organizationId), "detail", String(modelId)] as const,
};
