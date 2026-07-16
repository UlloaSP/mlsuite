/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { CreateSchemaDraftRequest } from "../dtos";
import { SCHEMA_DRAFTS_QUERY_KEY } from "./query-keys";

export function useCreateSchemaDraftMutation(schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSchemaDraftRequest) => schemaApi.createSchemaDraft(schemaId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_DRAFTS_QUERY_KEY(schemaId) }),
  });
}
