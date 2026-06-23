/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { CreateSchemaVersionRequest } from "../dtos";
import { SCHEMA_VERSIONS_QUERY_KEY } from "./query-keys";

export function useCreateSchemaVersionMutation(schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSchemaVersionRequest) => schemaApi.createSchemaVersion(schemaId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_VERSIONS_QUERY_KEY(schemaId) }),
  });
}
