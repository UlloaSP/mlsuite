/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PermissionKey } from "./index";

export interface CreateRoleFromTemplateRequest {
  templateId: number;
  name?: string;
  permissionKeys?: PermissionKey[];
}
