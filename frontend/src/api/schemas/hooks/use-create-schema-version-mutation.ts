/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { CreateSchemaVersionRequest } from "@/api/schemas/dtos";
import { SCHEMA_VERSIONS_QUERY_KEY } from "./query-keys";

export function useCreateSchemaVersionMutation(schemaId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreateSchemaVersionRequest) => schemaApi.createSchemaVersion(schemaId, req),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: SCHEMA_VERSIONS_QUERY_KEY(organizationId, schemaId) }),
  });
}
