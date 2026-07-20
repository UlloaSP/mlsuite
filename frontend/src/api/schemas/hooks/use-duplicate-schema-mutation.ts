/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { duplicateSchema } from "@/api/schemas/services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export const useDuplicateSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: duplicateSchema,
    onSuccess: () => void invalidate(),
  });
};
