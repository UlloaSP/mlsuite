/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { queryOptions } from "@tanstack/react-query";
import { appFetch } from "@/shared/api/http";
import type { RuntimeEnvironmentDto } from "@/shared/api/openapi.gen";

/**
 * An environment is named by its key across organizations and never changes under it, so it is
 * not tenant-scoped and is read once.
 */
export const runtimeEnvironmentQueryOptions = (environmentKey: string) =>
  queryOptions({
    queryKey: ["runtime-environments", environmentKey] as const,
    queryFn: ({ signal }) =>
      appFetch<RuntimeEnvironmentDto>(
        `/api/runtime-environments/${encodeURIComponent(environmentKey)}`,
        { signal },
      ),
    staleTime: Number.POSITIVE_INFINITY,
    meta: { errorHandledLocally: true },
  });
