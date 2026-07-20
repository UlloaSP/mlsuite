/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import {
  SCHEMA_DRAFTS_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_VERSIONS_QUERY_KEY,
} from "./query-keys";

export function usePublishSchemaDraftMutation(draftId: string, schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (expectedDraftRevision: number) =>
      schemaApi.publishSchemaDraft(draftId, expectedDraftRevision),
    onSuccess: (result) => {
      qc.setQueryData(SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId), result.draft);
      void qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId) });
      void qc.invalidateQueries({ queryKey: SCHEMA_VERSIONS_QUERY_KEY(organizationId, schemaId) });
    },
  });
}
