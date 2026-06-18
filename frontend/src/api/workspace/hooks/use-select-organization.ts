/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as workspaceApi from "../services";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "./query-keys";

export const useSelectOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.selectOrganization,
    onSuccess: (context) => {
      qc.setQueryData(WORKSPACE_CONTEXT_QUERY_KEY, context);
      void qc.invalidateQueries({ queryKey: ["getModels"] });
    },
  });
};
