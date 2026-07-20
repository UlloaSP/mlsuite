/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import { SCHEMA_BOOKMARK_QUERY_KEY } from "./query-keys";

export const useSchemaBookmark = (bookmarkId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmarkId ?? ""),
    queryFn: () => schemaApi.getSchemaBookmark(bookmarkId ?? ""),
    enabled: Boolean(bookmarkId),
  });
};
