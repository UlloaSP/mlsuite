/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/review/services";
import { SCHEMA_REVIEW_LINKS_QUERY_KEY } from "./query-keys";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";

export function useRevokeSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const qc = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    mutationFn: api.revokeSchemaReviewLink,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(organizationId, schemaId, versionId),
      }),
  });
}
