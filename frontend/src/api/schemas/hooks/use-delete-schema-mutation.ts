/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { deleteSchema } from "@/api/schemas/services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export const useDeleteSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: deleteSchema,
    onSuccess: () => void invalidate(),
  });
};
