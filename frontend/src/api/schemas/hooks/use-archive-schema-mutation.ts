/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { archiveSchema } from "../services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export const useArchiveSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({ mutationFn: archiveSchema, onSuccess: () => void invalidate() });
};
