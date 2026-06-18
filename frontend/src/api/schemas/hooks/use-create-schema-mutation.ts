/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import { SCHEMAS_QUERY_KEY } from "./query-keys";

export function useCreateSchemaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: schemaApi.createSchema,
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMAS_QUERY_KEY }),
  });
}
