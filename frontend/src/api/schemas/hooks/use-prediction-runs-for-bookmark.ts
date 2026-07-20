/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import { bookmarkPredictionRunsQueryOptions } from "@/api/schemas/schema-queries";

export const usePredictionRunsForBookmark = (bookmarkId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...bookmarkPredictionRunsQueryOptions(organizationId, bookmarkId),
    placeholderData: [],
  });
};
