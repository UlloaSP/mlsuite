/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvalidateModelQueries } from "@/api/models/hooks";
import { useInvalidatePluginQueries } from "@/api/plugins/hooks";
import { useInvalidateSchemaQueries } from "@/api/schemas/hooks";
import * as workspaceApi from "@/api/workspace/services";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "./query-keys";

export const useSelectOrganization = () => {
  const qc = useQueryClient();
  const invalidateModels = useInvalidateModelQueries();
  const invalidatePlugins = useInvalidatePluginQueries();
  const invalidateSchemas = useInvalidateSchemaQueries();
  return useMutation({
    mutationFn: workspaceApi.selectOrganization,
    onSuccess: async (context) => {
      qc.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY, context);
      await Promise.all([invalidateModels(), invalidatePlugins(), invalidateSchemas()]);
    },
  });
};
