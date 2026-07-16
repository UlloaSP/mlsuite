/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { SchemaDraftDto, UpdateSchemaDraftRequest } from "../dtos";
import {
  SCHEMA_DRAFT_DIFF_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_DRAFTS_QUERY_KEY,
} from "./query-keys";

export function useUpdateSchemaDraftMutation(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdateSchemaDraftRequest) => schemaApi.updateSchemaDraft(draftId, req),
    onSuccess: (draft: SchemaDraftDto) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(draftId), draft);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFT_DIFF_QUERY_KEY(draftId) });
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(draft.schemaId) });
    },
  });
}
