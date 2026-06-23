/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as workspaceApi from "../services";
import { WORKSPACE_CONTEXT_QUERY_KEY, PENDING_INVITATIONS_QUERY_KEY } from "./query-keys";

export const useAcceptInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.acceptInvitation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY });
    },
  });
};
