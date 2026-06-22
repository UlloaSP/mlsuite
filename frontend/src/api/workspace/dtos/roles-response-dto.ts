/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PermissionGroupDto, RoleDefinitionDto, RoleTemplateDto } from "./index";

export interface RolesResponseDto {
  roles: RoleDefinitionDto[];
  templates: RoleTemplateDto[];
  permissionCatalog: PermissionGroupDto[];
  stats: {
    customRoles: number;
    lockedRoles: number;
    assignedUsers: number;
  };
}
