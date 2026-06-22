/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { duplicateSchema } from "../services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export const useDuplicateSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({ mutationFn: duplicateSchema, onSuccess: () => void invalidate() });
};
