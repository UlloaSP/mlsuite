/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { pendingInvitationsQueryOptions } from "@/api/workspace/workspace-queries";

export const usePendingInvitations = () =>
  useQuery({
    ...pendingInvitationsQueryOptions(),
    refetchInterval: 60_000,
  });
