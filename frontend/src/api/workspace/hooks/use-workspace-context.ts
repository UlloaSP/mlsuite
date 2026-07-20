/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { workspaceContextQueryOptions } from "@/api/workspace/workspace-queries";

export const useWorkspaceContext = (enabled = true) =>
  useQuery({ ...workspaceContextQueryOptions(), enabled });
