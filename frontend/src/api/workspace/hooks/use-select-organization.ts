/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvalidateModelQueries } from "../../models/hooks";
import { useInvalidatePluginQueries } from "../../plugins/hooks";
import { useInvalidateSchemaQueries } from "../../schemas/hooks";
import * as workspaceApi from "../services";
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
