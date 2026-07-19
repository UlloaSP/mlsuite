/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export function useCreateSchemaMutation() {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    mutationFn: schemaApi.createSchema,
    onSuccess: () => void invalidate(),
  });
}
