/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as workspaceApi from "../services";
import { PENDING_INVITATIONS_QUERY_KEY } from "./query-keys";

export const usePendingInvitations = () =>
  useQuery({
    queryKey: PENDING_INVITATIONS_QUERY_KEY,
    queryFn: workspaceApi.getPendingInvitations,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
