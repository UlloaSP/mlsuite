/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { SchemaDraftMergeRequest } from "@/api/schemas/dtos";
import {
  SCHEMA_DRAFT_DIFF_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_DRAFTS_QUERY_KEY,
} from "./query-keys";

export function useMergeSchemaDraftMutation(draftId: string, schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: SchemaDraftMergeRequest) => schemaApi.mergeSchemaDraft(draftId, request),
    onSuccess: (result) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(draftId), result.draft);
      qc.setQueryData(SCHEMA_DRAFT_DIFF_QUERY_KEY(draftId), result.diff);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(schemaId) });
    },
  });
}
