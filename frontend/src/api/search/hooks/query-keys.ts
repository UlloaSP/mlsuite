/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/api/workspace/hooks/query-keys";

export const SEARCH_QUERY_KEY = (organizationId: number | string, query: string) =>
  [...organizationQueryKey(organizationId), "search", query] as const;
