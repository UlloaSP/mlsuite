/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import {
  SCHEMA_DRAFTS_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_VERSIONS_QUERY_KEY,
} from "./query-keys";

export function usePublishSchemaDraftMutation(draftId: string, schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expectedDraftRevision: number) =>
      schemaApi.publishSchemaDraft(draftId, expectedDraftRevision),
    onSuccess: (result) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(draftId), result.draft);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(schemaId) });
      void qc.invalidateQueries({ queryKey: SCHEMA_VERSIONS_QUERY_KEY(schemaId) });
    },
  });
}
