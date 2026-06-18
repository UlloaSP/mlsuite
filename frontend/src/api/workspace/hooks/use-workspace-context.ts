/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import * as workspaceApi from "../services";
import { WORKSPACE_CONTEXT_QUERY_KEY } from "./query-keys";

export const useWorkspaceContext = (enabled = true) =>
  useQuery({
    queryKey: WORKSPACE_CONTEXT_QUERY_KEY,
    queryFn: workspaceApi.getWorkspaceContext,
    staleTime: 60_000,
    enabled,
  });
