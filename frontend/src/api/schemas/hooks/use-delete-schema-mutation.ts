/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { deleteSchema } from "../services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export const useDeleteSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({ mutationFn: deleteSchema, onSuccess: () => void invalidate() });
};
