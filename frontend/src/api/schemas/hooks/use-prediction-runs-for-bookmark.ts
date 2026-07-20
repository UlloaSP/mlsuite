/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import { BOOKMARK_PREDICTION_RUNS_QUERY_KEY } from "./query-keys";

export const usePredictionRunsForBookmark = (bookmarkId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(organizationId, bookmarkId ?? ""),
    queryFn: () => schemaApi.getPredictionRunsForBookmark(bookmarkId ?? ""),
    enabled: Boolean(bookmarkId),
    placeholderData: [],
  });
};
