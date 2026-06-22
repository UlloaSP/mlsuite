/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PermissionKey } from "./index";

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionKeys: PermissionKey[];
}
