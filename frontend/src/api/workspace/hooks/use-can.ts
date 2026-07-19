/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { WorkspacePermissionKey } from "@/api/workspace/dtos";
import { useWorkspacePermissions } from "./use-workspace-permissions";

export function useCan(permission: WorkspacePermissionKey) {
  const permissions = useWorkspacePermissions();
  return Boolean(permissions?.[permission]);
}
