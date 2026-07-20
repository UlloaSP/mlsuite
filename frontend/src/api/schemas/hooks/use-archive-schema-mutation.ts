/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { archiveSchema } from "@/api/schemas/services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export const useArchiveSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: archiveSchema,
    onSuccess: () => void invalidate(),
  });
};
