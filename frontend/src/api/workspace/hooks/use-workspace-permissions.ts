/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useWorkspaceContext } from "./use-workspace-context";

export function useWorkspacePermissions() {
  return useWorkspaceContext().data?.permissions ?? null;
}
