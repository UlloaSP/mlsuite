/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation } from "@tanstack/react-query";
import { renameSchema } from "../services";
import { useInvalidateSchemaQueries } from "./use-invalidate-schema-queries";

export const useRenameSchemaMutation = () => {
  const invalidate = useInvalidateSchemaQueries();
  return useMutation({ mutationFn: renameSchema, onSuccess: () => void invalidate() });
};
