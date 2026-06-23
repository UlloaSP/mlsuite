/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PermissionDto, RoleScope } from "./index";

export interface RoleDefinitionDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  scope: RoleScope;
  locked: boolean;
  systemKey?: string | null;
  userCount: number;
  permissions: PermissionDto[];
  actions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canDuplicate: boolean;
    canAssign: boolean;
  };
}
