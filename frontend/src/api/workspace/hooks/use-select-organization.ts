/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as workspaceApi from "@/api/workspace/services";
import type { WorkspaceContextDto } from "@/api/workspace/dtos";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "./query-keys";
import { removeOrganizationCache } from "./organization-cache";

export const useSelectOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.selectOrganization,
    onSuccess: async (context) => {
      const previous = qc.getQueryData<WorkspaceContextDto>(WORKSPACE_CONTEXT_QUERY_KEY);
      const previousOrganizationId = previous?.currentOrganization.id;
      if (previousOrganizationId !== undefined) {
        await removeOrganizationCache(qc, previousOrganizationId);
      }
      qc.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY, context);
    },
  });
};
