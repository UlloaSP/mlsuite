/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { CreateSchemaBookmarkRequest } from "../dtos";
import { SCHEMA_BOOKMARKS_QUERY_KEY, SCHEMA_BOOKMARK_QUERY_KEY } from "./query-keys";

export function useCreateSchemaBookmarkMutation(schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSchemaBookmarkRequest) => schemaApi.createSchemaBookmark(schemaId, req),
    onSuccess: (bookmark) => {
      qc.setQueryData(SCHEMA_BOOKMARK_QUERY_KEY(bookmark.id), bookmark);
      void qc.invalidateQueries({ queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(schemaId) });
    },
  });
}
