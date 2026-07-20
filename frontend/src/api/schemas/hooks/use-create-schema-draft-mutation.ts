/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { CreateSchemaDraftRequest } from "@/api/schemas/dtos";
import { SCHEMA_DRAFTS_QUERY_KEY } from "./query-keys";

export function useCreateSchemaDraftMutation(schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaDraftRequest) => schemaApi.createSchemaDraft(schemaId, req),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId) }),
  });
}
