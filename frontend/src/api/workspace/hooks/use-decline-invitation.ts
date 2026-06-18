/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as workspaceApi from "../services";
import { PENDING_INVITATIONS_QUERY_KEY } from "./query-keys";

export const useDeclineInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspaceApi.declineInvitation,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
    },
  });
};
