/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { SchemaDraftDto, UpdateSchemaDraftRequest } from "@/api/schemas/dtos";
import {
  SCHEMA_DRAFT_DIFF_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_DRAFTS_QUERY_KEY,
} from "./query-keys";

export function useUpdateSchemaDraftMutation(draftId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: UpdateSchemaDraftRequest) => schemaApi.updateSchemaDraft(draftId, req),
    onSuccess: (draft: SchemaDraftDto) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), draft);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFT_DIFF_QUERY_KEY(organizationId, draftId) });
      void qc.invalidateQueries({
        queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, draft.schemaId),
      });
    },
  });
}
