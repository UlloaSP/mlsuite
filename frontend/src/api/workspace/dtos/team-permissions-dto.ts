/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface TeamPermissionsDto {
  canViewTeam: boolean;
  canEditTeam: boolean;
  canDeleteTeam: boolean;
  canViewTeamMembers: boolean;
  canManageTeamMemberRoles: boolean;
  canRemoveTeamMembers: boolean;
}
