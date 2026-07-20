/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { CreateSchemaBookmarkRequest } from "@/api/schemas/dtos";
import { SCHEMA_BOOKMARKS_QUERY_KEY, SCHEMA_BOOKMARK_QUERY_KEY } from "./query-keys";

export function useCreateSchemaBookmarkMutation(schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaBookmarkRequest) => schemaApi.createSchemaBookmark(schemaId, req),
    onSuccess: (bookmark) => {
      qc.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmark.id), bookmark);
      void qc.invalidateQueries({ queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId) });
    },
  });
}
