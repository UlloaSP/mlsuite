/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/review/services";
import { SCHEMA_REVIEW_LINKS_QUERY_KEY } from "./query-keys";
import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";

export function useCreateSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const qc = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: api.createSchemaReviewLink,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(organizationId, schemaId, versionId),
      }),
  });
}
